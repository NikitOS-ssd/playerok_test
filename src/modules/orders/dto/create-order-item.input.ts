import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class CreateOrderItemInput {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsInt()
  @IsPositive()
  quantity!: number;
}

