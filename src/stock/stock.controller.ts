import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { StockService } from './stock.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('ingreso')
  create(@Body() createStockDto: CreateStockDto) {
    return this.stockService.ingresarStock(createStockDto);
  }

  @Get()
  findAll() {
    return this.stockService.consultarTodo();
  }
}