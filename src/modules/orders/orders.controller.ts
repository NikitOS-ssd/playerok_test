import { Controller, Get } from '@nestjs/common';

@Controller('orders')
export class OrdersController {
  @Get()
  list(): { message: string } {
    return { message: 'List of orders will be here' };
  }
}

