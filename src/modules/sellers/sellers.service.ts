import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateSellerDto } from './dto/create-seller.dto'
import { UpdateSellerDto } from './dto/update-seller.dto'

@Injectable()
export class SellersService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createSellerDto: CreateSellerDto) {
    return this.prisma.seller.create({
      data: {
        name: createSellerDto.name,
      },
    })
  }

  async getAll() {
    return this.prisma.seller.findMany()
  }

  async updateById(id: string, updateSellerDto: UpdateSellerDto) {
    return this.prisma.seller.update({
      where: { id },
      data: {
        name: updateSellerDto.name,
      },
    })
  }

  async deleteById(id: string) {
    return this.prisma.seller.delete({
      where: { id },
    })
  }
}