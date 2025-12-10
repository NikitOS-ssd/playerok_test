import { Module } from "@nestjs/common"
import { PrismaModule } from "src/prisma/prisma.module"
import { OrdersModule } from "../orders/orders.module"
import { PaymentsService } from "./payments.service"
import { PaymentsController } from "./payments.controller"

@Module({
  imports: [PrismaModule, OrdersModule],
  exports: [PaymentsService],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})

export class PaymentsModule {}