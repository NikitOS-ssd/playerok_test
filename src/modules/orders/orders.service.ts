import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { ORDER_STATUS, OrderStatus } from './constants/order-status';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly stripe: Stripe | null;

  constructor(private readonly prisma: PrismaService) {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (secret) {
      this.stripe = new Stripe(secret);
    } else {
      this.logger.warn('STRIPE_SECRET_KEY is not set; payment link creation will fail');
      this.stripe = null;
    }
  }

  async createOrder(dto: CreateOrderDto) {
    const productIds = dto.items.map((i) => i.productId);
    this.logger.log(`Create order start for buyerEmail=${dto.buyerEmail}, products=${productIds.join(',')}`);

    return this.prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, price: true, stock: true, isActive: true },
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException('Some products not found');
      }

      const productMap = new Map(products.map((p) => [p.id, p]));

      // Validate availability and build order items
      const orderItems = dto.items.map((item) => {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new BadRequestException(`Product ${item.productId} not found`);
        }
        if (!product.isActive) {
          throw new BadRequestException(`Product ${item.productId} is inactive`);
        }
        if (product.stock < item.quantity) {
          throw new BadRequestException(`Not enough stock for product ${item.productId}`);
        }

        const price = product.price;
        const subtotal = price.mul(item.quantity);
        return {
          productId: item.productId,
          quantity: item.quantity,
          price,
          subtotal,
        };
      });

      // Update stocks
      for (const item of orderItems) {
        const product = productMap.get(item.productId)!;
        this.logger.log(
          `Reserve stock for product=${product.id}: stock ${product.stock} -> ${
            product.stock - item.quantity
          }`,
        );
        await tx.product.update({
          where: { id: product.id },
          data: { stock: product.stock - item.quantity },
        });
      }

      const totalAmount = orderItems.reduce(
        (acc, item) => acc.add(item.subtotal),
        new Prisma.Decimal(0),
      );

      const order = await tx.order.create({
        data: {
          buyerEmail: dto.buyerEmail,
          status: ORDER_STATUS[0], // PENDING
          totalAmount,
          items: {
            create: orderItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.subtotal,
            })),
          },
        },
        include: { items: true },
      });

      this.logger.log(`Order created id=${order.id}, buyerEmail=${order.buyerEmail}, totalAmount=${totalAmount}`);
      return order;
    });
  }

  getOrderById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
  }

  getOrders(params?: {
    skip?: number;
    take?: number;
    buyerEmail?: string;
    status?: OrderStatus;
  }) {
    return this.prisma.order.findMany({
      skip: params?.skip,
      take: params?.take,
      where: {
        buyerEmail: params?.buyerEmail,
        status: params?.status,
      },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: true } } },
    });
  }

  async cancelOrder(id: string, _dto: CancelOrderDto) {
    this.logger.log(`Cancel order request id=${id}`);

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status === 'CANCELLED') {
        return order; // идемпотентность
      }

      // Cancel only pending orders
      if (!['PENDING'].includes(order.status)) {
        throw new BadRequestException('Order cannot be cancelled in its current status');
      }

      // вернуть остатки по товарам
      for (const item of order.items) {
        this.logger.log(
          `Restock product=${item.productId} by quantity=${item.quantity} for order=${id}`,
        );
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      const updatedOrder = await tx.order.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: { items: true },
      });

      this.logger.log(`Order cancelled id=${updatedOrder.id}, buyerEmail=${updatedOrder.buyerEmail}`);
      return updatedOrder;
    });
  }

  async createPaymentLink(id: string, dto: CreatePaymentLinkDto) {
    this.logger.log(`Create payment link request id=${id}, userId=${dto.userId}`);

    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const successUrl = process.env.STRIPE_SUCCESS_URL;
    const cancelUrl = process.env.STRIPE_CANCEL_URL;
    if (!successUrl || !cancelUrl) {
      throw new BadRequestException('Stripe redirect URLs are not configured');
    }

    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException('Only pending orders can be paid');
    }

    const amountCents = order.totalAmount.mul(100).toNumber();
    if (amountCents <= 0) {
      throw new BadRequestException('Order amount must be positive');
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
        userId: dto.userId,
        buyerEmail: order.buyerEmail,
        totalAmount: order.totalAmount.toString(),
      },
    });

    this.logger.log(`Payment link created for order=${id}, session=${session.id}`);

    return { url: session.url };
  }

  async handleStripeWebhook(rawBody: Buffer, signature?: string) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new BadRequestException('Stripe webhook secret is not configured');
    }

    if (!signature) {
      throw new BadRequestException('Missing Stripe signature');
    }

    let event: Stripe.Event;
    try {
      // rawBody can come as Buffer (preferred). If not, try to coerce.
      const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody as any);
      event = this.stripe.webhooks.constructEvent(bodyBuffer, signature, webhookSecret);
    } catch (err) {
      this.logger.warn(`Invalid Stripe signature: ${(err as Error).message}`);
      throw new BadRequestException('Invalid Stripe signature');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        const orderId = metadata.orderId;
        const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : undefined;
        if (!orderId) {
          this.logger.warn('checkout.session.completed received without orderId metadata');
          break;
        }

        if (session.payment_status === 'paid') {
          await this.markOrderPaid(orderId, session.id, paymentIntentId);
        } else {
          this.logger.log(`Checkout session completed with non-paid status: ${session.payment_status}`);
        }
        break;
      }
      default:
        this.logger.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return { received: true };
  }

  private async markOrderPaid(orderId: string, sessionId: string, paymentIntentId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });

    if (!order) {
      this.logger.warn(`Order not found for payment webhook, orderId=${orderId}, session=${sessionId}`);
      return;
    }

    if (order.status === 'PAID') {
      this.logger.log(`Order already paid, orderId=${orderId}`);
      return;
    }

    if (order.status === 'CANCELLED') {
      this.logger.warn(`Received payment for cancelled order, orderId=${orderId}, session=${sessionId}`);
      return;
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'PAID' },
    });

    this.logger.log(
      `Order marked as PAID, orderId=${orderId}, session=${sessionId}, paymentIntent=${paymentIntentId ?? 'n/a'}`,
    );
  }
}

