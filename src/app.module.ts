import { Module } from '@nestjs/common';
import { SellersModule } from './modules/sellers/sellers.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    // Domain modules are ready to be extended with controllers/services.
    SellersModule,
    ProductsModule,
    OrdersModule,
  ],
})
export class AppModule {}

