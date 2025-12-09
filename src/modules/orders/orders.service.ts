import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { ORDER_STATUS, OrderStatus } from './constants/order-status';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly prisma: PrismaService) {}

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

      if (!['PENDING', 'CREATED'].includes(order.status)) {
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
}

