import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(dto: CreateOrderDto) {
    const productIds = dto.items.map((i) => i.productId);

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
          status: 'PENDING',
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

      return order;
    });
  }

  getOrderById(id: string) {
    return this.prisma.order.findUnique({ where: { id }, include: { items: true } });
  }

  getOrders(params?: { skip?: number; take?: number }) {
    return this.prisma.order.findMany({
      skip: params?.skip,
      take: params?.take,
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }

  async cancelOrder(id: string, _dto: CancelOrderDto) {
    return this.prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { items: true },
    });
  }
}

