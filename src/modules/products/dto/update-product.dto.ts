import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class UpdateProductDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  sellerId?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  price?: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  stock?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

