import { Controller, Get } from '@nestjs/common';

@Controller('sellers')
export class SellersController {
  @Get()
  list(): { message: string } {
    return { message: 'List of sellers will be here' };
  }
}

