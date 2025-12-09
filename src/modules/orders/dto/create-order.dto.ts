import { Type } from 'class-transformer';
import { IsArray, IsEmail, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateOrderItemInput } from './create-order-item.input';

export class CreateOrderDto {
  @ApiProperty({ example: 'buyer@example.com' })
  @IsEmail()
  buyerEmail!: string;

  @ApiProperty({ type: [CreateOrderItemInput] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemInput)
  items!: CreateOrderItemInput[];
}

