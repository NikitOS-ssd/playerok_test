import { Type } from 'class-transformer';
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

export class GetOrdersQuery {
  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ example: 'buyer@example.com' })
  @IsEmail()
  @IsOptional()
  buyerEmail?: string;

  @ApiPropertyOptional({ enum: Prisma.OrderStatus, example: Prisma.OrderStatus.PENDING })
  @IsEnum(Prisma.OrderStatus)
  @IsOptional()
  status?: Prisma.OrderStatus;
}

