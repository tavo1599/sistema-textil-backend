import { Controller, Post, Body } from '@nestjs/common';
import { LiquidacionesService } from './liquidaciones.service';
import { CreateLiquidationDto } from './dto/create-liquidacione.dto';


@Controller('liquidaciones')
export class LiquidacionesController {
  constructor(private readonly liquidacionesService: LiquidacionesService) {}

  @Post('calcular')
  create(@Body() createLiquidationDto: CreateLiquidationDto) {
    return this.liquidacionesService.calcularCostoReal(createLiquidationDto);
  }
}