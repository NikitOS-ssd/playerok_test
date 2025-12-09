import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        sellerId: dto.sellerId,
        title: dto.title,
        price: dto.price,
        stock: dto.stock,
        isActive: dto.isActive ?? true,
      },
    });
  }

  update(id: string, dto: UpdateProductDto) {
    return this.prisma.product.update({
      where: { id },
      data: {
        sellerId: dto.sellerId,
        title: dto.title,
        price: dto.price,
        stock: dto.stock,
        isActive: dto.isActive,
      },
    });
  }

  findAll(params?: { sellerId?: string; isActive?: boolean }) {
    return this.prisma.product.findMany({
      where: {
        sellerId: params?.sellerId,
        isActive: params?.isActive,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

