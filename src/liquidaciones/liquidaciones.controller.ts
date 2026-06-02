import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { LiquidacionesService } from './liquidaciones.service';
import { CreateLiquidationDto } from './dto/create-liquidacione.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('liquidaciones')
export class LiquidacionesController {
  constructor(private readonly liquidacionesService: LiquidacionesService) {}

  @Post('costo-real')
  calcularCostoReal(@Body() dto: CreateLiquidationDto) {
    return this.liquidacionesService.calcularCostoReal(dto);
  }
}