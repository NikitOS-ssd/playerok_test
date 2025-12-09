import { Controller, Get } from '@nestjs/common';

@Controller('products')
export class ProductsController {
  @Get()
  list(): { message: string } {
    return { message: 'List of products will be here' };
  }
}

