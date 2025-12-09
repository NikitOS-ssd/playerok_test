import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrdersService } from '../src/modules/orders/orders.service';
import { CreateOrderDto } from '../src/modules/orders/dto/create-order.dto';

type MockPrisma = {
  product: {
    findMany: jest.Mock;
    update: jest.Mock;
  };
  order: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  $transaction: jest.Mock;
};

function createMockPrisma(overrides: Partial<MockPrisma> = {}): MockPrisma {
  const mockTx = {
    product: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const txExecutor = jest.fn(async (cb: any) => cb(mockTx));

  return {
    product: mockTx.product,
    order: mockTx.order,
    $transaction: txExecutor,
    ...overrides,
  } as MockPrisma;
}

describe('OrdersService', () => {
  it('creates order when stock is sufficient', async () => {
    const prisma = createMockPrisma();
    prisma.product.findMany.mockResolvedValue([
      { id: 'p1', price: new Prisma.Decimal(100), stock: 10, isActive: true },
    ]);
    prisma.order.create.mockResolvedValue({
      id: 'o1',
      buyerEmail: 'buyer@example.com',
      status: Prisma.OrderStatus.PENDING,
      totalAmount: new Prisma.Decimal(200),
      items: [],
    });

    const service = new OrdersService(prisma as any);
    const dto: CreateOrderDto = {
      buyerEmail: 'buyer@example.com',
      items: [{ productId: 'p1', quantity: 2 }],
    };

    const result = await service.createOrder(dto);

    expect(result.id).toBe('o1');
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { stock: 8 },
    });
    expect(prisma.order.create).toHaveBeenCalled();
  });

  it('throws BadRequest when stock is insufficient', async () => {
    const prisma = createMockPrisma();
    prisma.product.findMany.mockResolvedValue([
      { id: 'p1', price: new Prisma.Decimal(100), stock: 1, isActive: true },
    ]);

    const service = new OrdersService(prisma as any);
    const dto: CreateOrderDto = {
      buyerEmail: 'buyer@example.com',
      items: [{ productId: 'p1', quantity: 2 }],
    };

    await expect(service.createOrder(dto)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('cancels order and restocks items', async () => {
    const prisma = createMockPrisma();
    prisma.$transaction = jest.fn(async (cb: any) =>
      cb({
        ...prisma,
        order: {
          findUnique: prisma.order.findUnique,
          update: prisma.order.update,
        },
        product: prisma.product,
      }),
    );

    prisma.order.findUnique = jest.fn().mockResolvedValue({
      id: 'o1',
      status: Prisma.OrderStatus.PENDING,
      items: [{ productId: 'p1', quantity: 2 }],
    });
    prisma.order.update = jest.fn().mockResolvedValue({
      id: 'o1',
      status: Prisma.OrderStatus.CANCELLED,
      items: [{ productId: 'p1', quantity: 2 }],
    });

    const service = new OrdersService(prisma as any);
    const result = await service.cancelOrder('o1', {});

    expect(result.status).toBe(Prisma.OrderStatus.CANCELLED);
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { stock: { increment: 2 } },
    });
  });
});

