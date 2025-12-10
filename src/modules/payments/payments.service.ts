import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common"
import { PrismaService } from "src/prisma/prisma.service"
import { OrdersService } from "../orders/orders.service"
import Stripe from "stripe"

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe | null

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {
    const secret = process.env.STRIPE_SECRET_KEY
    if (secret) {
      this.stripe = new Stripe(secret)
    } else {
      this.logger.warn('STRIPE_SECRET_KEY is not set; payment link creation will fail')
      this.stripe = null
    }
  }

  async createPaymentLink(orderId: string) {
    this.logger.log(`Create payment link request order-id=${orderId}`)

    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured')
    }

    const successUrl = process.env.STRIPE_SUCCESS_URL
    const cancelUrl = process.env.STRIPE_CANCEL_URL
    if (!successUrl || !cancelUrl) {
      throw new BadRequestException('Stripe redirect URLs are not configured')
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    })

    if (!order) {
      throw new NotFoundException('Order not found')
    }

    if(order.status !== 'PENDING') {
      throw new BadRequestException('Only pending orders can be paid')
    }

    const amountCents = order.totalAmount.mul(100).toNumber()
    if (amountCents <= 0) {
      throw new BadRequestException('Order amount must be positive')
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: order.buyerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            product_data: { name: `Order ${order.id}` },
            unit_amount: Math.round(amountCents),
          },
        },
      ],
      metadata: {
        orderId: order.id,
        buyerEmail: order.buyerEmail,
        totalAmount: order.totalAmount.toString(),
      },
    })

    this.logger.log(`Payment link created for order=${orderId}, session=${session.id}`)

    return { url: session.url };
  }

  async handleStripeWebhook(rawBody: Buffer, signature?: string) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured')
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      throw new BadRequestException('Stripe webhook secret is not configured')
    }

    if (!signature) {
      throw new BadRequestException('Missing Stripe signature')
    }

    let event: Stripe.Event
    try {
      // rawBody can come as Buffer (preferred). If not, try to coerce.
      const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody as any)
      event = this.stripe.webhooks.constructEvent(bodyBuffer, signature, webhookSecret)
    } catch (err) {
      this.logger.warn(`Invalid Stripe signature: ${(err as Error).message}`)
      throw new BadRequestException('Invalid Stripe signature')
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const metadata = session.metadata || {}
        const orderId = metadata.orderId
        const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : undefined
        if (!orderId) {
          this.logger.warn('checkout.session.completed received without orderId metadata')
          break
        }

        if (session.payment_status === 'paid') {
          await this.ordersService.markOrderPaid(orderId, session.id, paymentIntentId)
        } else {
          this.logger.log(`Checkout session completed with non-paid status: ${session.payment_status}`)
        }
        break
      }
      default:
        this.logger.log(`Unhandled Stripe event type: ${event.type}`)
    }

    return { received: true }
  }

}