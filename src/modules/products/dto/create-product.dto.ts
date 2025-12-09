import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  sellerId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsNumber()
  @IsPositive()
  price!: number;

  @IsInt()
  @IsPositive()
  stock!: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

