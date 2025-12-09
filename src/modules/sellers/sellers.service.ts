import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSellerDto } from './dto/create-seller.dto';

@Injectable()
export class SellersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSellerDto: CreateSellerDto) {
    return this.prisma.seller.create({
      data: {
        name: createSellerDto.name,
      },
    });
  }
}

