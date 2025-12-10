import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SellersService } from './sellers.service';
import { CreateSellerDto } from './dto/create-seller.dto';
import { UpdateSellerDto } from './dto/update-seller.dto'

@ApiTags('Sellers')
@Controller('sellers')
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  @Post()
  @ApiOperation({ summary: 'Create seller' })
  @ApiResponse({ status: 201, description: 'Seller created' })
  create(@Body() createSellerDto: CreateSellerDto) {
    return this.sellersService.create(createSellerDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all sellers' })
  @ApiResponse({ status: 200, description: 'List of sellers' })
  getAll() {
    return this.sellersService.getAll();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update seller by id' })
  @ApiResponse({ status: 200, description: 'Seller updated' })
  updateById(@Param('id') id: string, @Body() updateSellerDto: UpdateSellerDto) {
    return this.sellersService.updateById(id, updateSellerDto);
  }

  @Post(':id')
  @ApiOperation({ summary: 'Delete seller by id' })
  @ApiResponse({ status: 200, description: 'Seller deleted' })
  deleteById(@Param('id') id: string) {
    return this.sellersService.deleteById(id);
  }
}

