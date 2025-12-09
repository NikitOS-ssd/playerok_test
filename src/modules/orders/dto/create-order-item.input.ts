import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderItemInput {
  @ApiProperty({ example: 'product-uuid-1' })
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @IsPositive()
  quantity!: number;
}

