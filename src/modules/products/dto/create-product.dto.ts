import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'seller-uuid-1' })
  @IsString()
  @IsNotEmpty()
  sellerId!: string;

  @ApiProperty({ example: 'Wireless Mouse' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 1999, description: 'Price in minimal units (e.g. cents)' })
  @IsNumber()
  @IsPositive()
  price!: number;

  @ApiProperty({ example: 50 })
  @IsInt()
  @IsPositive()
  stock!: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

