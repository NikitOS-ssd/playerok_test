import { Type } from 'class-transformer';
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ORDER_STATUS, OrderStatus } from '../constants/order-status';

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

  @ApiPropertyOptional({ enum: ORDER_STATUS, example: ORDER_STATUS[0] })
  @IsIn(ORDER_STATUS)
  @IsOptional()
  status?: OrderStatus;
}

