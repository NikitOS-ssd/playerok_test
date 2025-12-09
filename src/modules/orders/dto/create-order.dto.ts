import { Type } from 'class-transformer';
import { IsArray, IsEmail, ValidateNested } from 'class-validator';
import { CreateOrderItemInput } from './create-order-item.input';

export class CreateOrderDto {
  @IsEmail()
  buyerEmail!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemInput)
  items!: CreateOrderItemInput[];
}

