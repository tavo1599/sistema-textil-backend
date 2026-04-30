import { Controller, Get, Post, Body } from '@nestjs/common';
import { StockService } from './stock.service';
import { CreateStockDto } from './dto/create-stock.dto';

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