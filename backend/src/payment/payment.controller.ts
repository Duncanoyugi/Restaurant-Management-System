// backend\src\payment\payment.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  HttpCode,
  HttpStatus,
  Headers,
  Res
} from '@nestjs/common';
import type { Response } from 'express'; // FIX: Add 'type' keyword
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { PaystackWebhookDto } from './dto/paystack-webhook.dto';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('initialize')
  @HttpCode(HttpStatus.CREATED)
  async initializePayment(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentService.initializePayment(createPaymentDto);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyPayment(@Body() verifyPaymentDto: VerifyPaymentDto) {
    return this.paymentService.verifyPayment(verifyPaymentDto);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() paystackWebhookDto: PaystackWebhookDto,
    @Headers('x-paystack-signature') signature: string,
  ) {
    return this.paymentService.handleWebhook(paystackWebhookDto);
  }

  @Get()
  async findAll() {
    return this.paymentService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.paymentService.findOne(id);
  }

  @Get('reference/:reference')
  async findByReference(@Param('reference') reference: string) {
    return this.paymentService.getPaymentByReference(reference);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentService.update(id, updatePaymentDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.paymentService.remove(id);
  }

  @Get(':id/invoice')
  async getInvoice(@Param('id') id: string, @Res() res: Response) {
    // This would generate and return PDF invoice
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${id}.pdf`);
    // Return PDF stream
  }
}