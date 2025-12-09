import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSellerDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

