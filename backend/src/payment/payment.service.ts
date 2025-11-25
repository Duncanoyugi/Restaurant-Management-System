// backend\src\payment\payment.service.ts
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { PaystackWebhookDto } from './dto/paystack-webhook.dto';
import { Invoice } from './entities/invoice.entity';

// Define Paystack response interfaces
interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerificationResponse {
  status: boolean;
  message: string;
  data: {
    status: string;
    reference: string;
    amount: number;
    paid_at: string;
    channel: string;
    gateway_response: string;
    metadata: any;
  };
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  private readonly paystackBaseUrl = 'https://api.paystack.co';

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
  ) {}

  async initializePayment(createPaymentDto: CreatePaymentDto) {
    try {
      // Generate unique reference
      const reference = `ref_${uuidv4().replace(/-/g, '').substring(0, 15)}`;
      
      // Prepare payment data
      const paymentData = {
        email: createPaymentDto.customerEmail,
        amount: Math.round(createPaymentDto.amount * 100), // Convert to kobo
        reference,
        currency: createPaymentDto.currency || 'NGN',
        channels: this.getChannels(createPaymentDto.method),
        metadata: {
          custom_fields: [
            {
              display_name: "Customer Name",
              variable_name: "customer_name",
              value: createPaymentDto.customerName
            },
            {
              display_name: "Order ID",
              variable_name: "order_id",
              value: createPaymentDto.orderId
            },
            {
              display_name: "Reservation ID",
              variable_name: "reservation_id",
              value: createPaymentDto.reservationId
            }
          ]
        },
        callback_url: createPaymentDto.callbackUrl
      };

      // Call Paystack API
      const response = await axios.post<PaystackInitializeResponse>(
        `${this.paystackBaseUrl}/transaction/initialize`,
        paymentData,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const paystackResponse = response.data;

      // Save payment record
      const payment = this.paymentRepository.create({
        userId: createPaymentDto.orderId, // You might want to get this from auth context
        orderId: createPaymentDto.orderId,
        reservationId: createPaymentDto.reservationId,
        roomBookingId: createPaymentDto.roomBookingId,
        amount: createPaymentDto.amount,
        currency: createPaymentDto.currency || 'NGN',
        status: PaymentStatus.PENDING,
        method: createPaymentDto.method,
        reference,
        accessCode: paystackResponse.data.access_code,
        authorizationUrl: paystackResponse.data.authorization_url,
        customerEmail: createPaymentDto.customerEmail,
        customerName: createPaymentDto.customerName,
        metadata: JSON.stringify(paymentData.metadata),
      });

      await this.paymentRepository.save(payment);

      return {
        success: true,
        message: 'Payment initialized successfully',
        data: {
          authorizationUrl: paystackResponse.data.authorization_url,
          accessCode: paystackResponse.data.access_code,
          reference: paystackResponse.data.reference,
          paymentId: payment.id,
        },
      };
    } catch (error) {
      this.logger.error('Failed to initialize payment', error.stack);
      throw new HttpException(
        error.response?.data?.message || 'Failed to initialize payment',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async verifyPayment(verifyPaymentDto: VerifyPaymentDto) {
    try {
      const { reference } = verifyPaymentDto;

      // Call Paystack verification API
      const response = await axios.get<PaystackVerificationResponse>(
        `${this.paystackBaseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
          },
        }
      );

      const verificationData = response.data;

      // Find payment record
      const payment = await this.paymentRepository.findOne({
        where: { reference },
      });

      if (!payment) {
        throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
      }

      // Update payment status based on verification
      if (verificationData.data.status === 'success') {
        payment.status = PaymentStatus.SUCCESS;
        payment.paidAt = new Date(verificationData.data.paid_at);
        payment.channel = verificationData.data.channel;
        payment.gatewayResponse = verificationData.data.gateway_response;
        payment.metadata = JSON.stringify(verificationData.data.metadata);

        // Create invoice
        await this.createInvoice(payment);
      } else {
        payment.status = PaymentStatus.FAILED;
        payment.gatewayResponse = verificationData.data.gateway_response;
      }

      await this.paymentRepository.save(payment);

      return {
        success: true,
        message: 'Payment verified successfully',
        data: {
          status: payment.status,
          paymentId: payment.id,
          amount: payment.amount,
          paidAt: payment.paidAt,
        },
      };
    } catch (error) {
      this.logger.error('Failed to verify payment', error.stack);
      throw new HttpException(
        error.response?.data?.message || 'Failed to verify payment',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async handleWebhook(paystackWebhookDto: PaystackWebhookDto) {
    try {
      const { event, data } = paystackWebhookDto;

      if (event === 'charge.success') {
        const payment = await this.paymentRepository.findOne({
          where: { reference: data.reference },
        });

        if (payment && payment.status === PaymentStatus.PENDING) {
          payment.status = PaymentStatus.SUCCESS;
          payment.paidAt = new Date(data.paid_at);
          payment.channel = data.channel;
          payment.gatewayResponse = data.gateway_response;
          payment.metadata = JSON.stringify(data.metadata);

          await this.paymentRepository.save(payment);

          // Create invoice for successful payment
          await this.createInvoice(payment);

          this.logger.log(`Payment ${data.reference} completed successfully`);
        }
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Webhook processing failed', error.stack);
      throw error;
    }
  }

  private async createInvoice(payment: Payment) {
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const invoice = this.invoiceRepository.create({
      paymentId: payment.id,
      invoiceNumber,
      issuedAt: new Date(),
      sentAt: new Date(),
      pdfUrl: '', // Use empty string instead of null
    });

    await this.invoiceRepository.save(invoice);
    return invoice;
  }

  private getChannels(method: string): string[] {
    const channelMap: Record<string, string[]> = {
      card: ['card'],
      bank: ['bank'],
      ussd: ['ussd'],
      mobile_money: ['mobile_money'],
      bank_transfer: ['bank_transfer'],
    };

    return channelMap[method] || ['card', 'bank', 'ussd', 'mobile_money', 'bank_transfer'];
  }

  async findAll() {
    return await this.paymentRepository.find({
      relations: ['invoices'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['invoices', 'user', 'order', 'reservation', 'roomBooking'],
    });

    if (!payment) {
      throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
    }

    return payment;
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto) {
    const payment = await this.findOne(id);
    Object.assign(payment, updatePaymentDto);
    return await this.paymentRepository.save(payment);
  }

  async remove(id: string) {
    const payment = await this.findOne(id);
    await this.paymentRepository.remove(payment);
    return { message: 'Payment deleted successfully' };
  }

  async getPaymentByReference(reference: string) {
    return await this.paymentRepository.findOne({
      where: { reference },
      relations: ['invoices'],
    });
  }
}