import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { GetOrdersQuery } from './dto/get-orders.query';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create order' })
  @ApiResponse({ status: 201, description: 'Order created' })
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by id' })
  @ApiResponse({ status: 200, description: 'Order found' })
  getById(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  @Get()
  @ApiOperation({ summary: 'List orders' })
  @ApiResponse({ status: 200, description: 'List of orders' })
  findAll(@Query() query: GetOrdersQuery) {
    const pageNum = query.page ?? 1;
    const takeNum = query.limit ?? 20;
    const skipNum = (pageNum - 1) * takeNum;

    return this.ordersService.getOrders({
      skip: skipNum,
      take: takeNum,
      buyerEmail: query.buyerEmail,
      status: query.status,
    });
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel order' })
  @ApiResponse({ status: 200, description: 'Order cancelled' })
  cancel(@Param('id') id: string, @Body() dto: CancelOrderDto) {
    return this.ordersService.cancelOrder(id, dto);
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create payment link for order' })
  @ApiResponse({ status: 200, description: 'Payment link created' })
  pay(@Param('id') id: string, @Body() dto: CreatePaymentLinkDto) {
    return this.ordersService.createPaymentLink(id, dto);
  }

  @Post('webhooks/stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  webhook(
    @Req() req: { rawBody?: Buffer; body?: unknown },
    @Headers('stripe-signature') signature?: string,
  ) {
    const raw = (req.rawBody ?? req.body) as Buffer;
    return this.ordersService.handleStripeWebhook(raw, signature);
  }
}

