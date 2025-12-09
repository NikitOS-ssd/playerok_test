import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(dto: CreateOrderDto) {
    // TODO: implement transactional creation with stock checks and totals
    return this.prisma.order.create({
      data: {
        buyerEmail: dto.buyerEmail,
        status: 'PENDING',
        totalAmount: 0, // compute later
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: 0,
            subtotal: 0,
          })),
        },
      },
      include: { items: true },
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

