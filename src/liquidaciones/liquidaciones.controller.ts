import { Controller, Post, Body } from '@nestjs/common';
import { LiquidacionesService } from './liquidaciones.service';
import { CreateLiquidationDto } from './dto/create-liquidacione.dto';

@Controller('liquidaciones')
export class LiquidacionesController {
  constructor(private readonly liquidacionesService: LiquidacionesService) {}

  @Post('costo-real')
  calcularCostoReal(@Body() dto: CreateLiquidationDto) {
    return this.liquidacionesService.calcularCostoReal(dto);
  }
}