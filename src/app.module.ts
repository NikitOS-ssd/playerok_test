import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { SellersModule } from './modules/sellers/sellers.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';

@Module({
  imports: [
    PrismaModule,
    MonitoringModule,
    // Domain modules are ready to be extended with controllers/services.
    SellersModule,
    ProductsModule,
    OrdersModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}

