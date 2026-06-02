import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards } from '@nestjs/common';
import { InsumosService } from './insumos.service';
import { InsumoKardexService } from '../kardex/insumo-kardex.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Ajusta la ruta si es necesario
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('insumos')
export class InsumosController {
  constructor(
    private readonly insumosService: InsumosService,
    private readonly insumoKardex: InsumoKardexService,
  ) {}

  @Post()
  create(@Body() data: any) {
    return this.insumosService.create(data);
  }

  @Get()
  findAll() {
    return this.insumosService.findAll();
  }

  @Get(':id/historial')
  obtenerHistorial(@Param('id') id: string) {
    return this.insumoKardex.obtenerHistorial(+id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.insumosService.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.insumosService.update(+id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.insumosService.remove(+id);
  }
}