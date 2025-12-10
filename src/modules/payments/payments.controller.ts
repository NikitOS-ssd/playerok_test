import { Controller, Header, Headers, HttpCode, HttpStatus, Param, Post, Req } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"
import { PaymentsService } from "./payments.service"

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(':orderId/create-link')
  @ApiOperation({ summary: 'Create payment link for order' })
  @ApiResponse({ status: 200, description: 'Payment link created' })
  createPaymentLink(@Param('orderId') orderId: string) {
    return this.paymentsService.createPaymentLink(orderId);
  }

  @Post('webhooks/stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  webhook(
    @Req() req: { rawBody?: Buffer; body?: unknown },
    @Headers('stripe-signature') signature?: string,
  ) {
    const raw = (req.rawBody ?? req.body) as Buffer
    return this.paymentsService.handleStripeWebhook(raw, signature)
  }
}