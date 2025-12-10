import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class CreatePaymentLinkDto {
  @ApiProperty({ example: 'user-uuid-1' })
  @IsString()
  @IsNotEmpty()
  userId!: string
}
