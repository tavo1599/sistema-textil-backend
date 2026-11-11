import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TransformacionesService } from './transformaciones.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('transformaciones')
export class TransformacionesController {
  constructor(private readonly servicio: TransformacionesService) {}

  /** Reporte de producción: kilos usados vs prendas salidas, rendimiento. */
  @Get('reporte')
  reporte(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('productoId') productoId?: string,
  ) {
    return this.servicio.reporte({
      desde,
      hasta,
      productoId: productoId ? Number(productoId) : undefined,
    });
  }

  /** Historial de cortes. */
  @Get()
  listar(
    @Query('estado') estado?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('productoId') productoId?: string,
  ) {
    return this.servicio.listar({
      estado,
      desde,
      hasta,
      productoId: productoId ? Number(productoId) : undefined,
    });
  }

  @Get(':id')
  detalle(@Param('id') id: string) {
    return this.servicio.detalle(Number(id));
  }

  /** Paso 1: el cortador se lleva los rollos y declara en qué prendas los convirtió. */
  @Post()
  crear(@Body() body: any) {
    return this.servicio.crear(body);
  }

  /** Paso 2: el taller devuelve la producción → las prendas entran al almacén. */
  @Patch(':id/recibir')
  recibir(@Param('id') id: string, @Body() body: any) {
    return this.servicio.recibir(Number(id), body);
  }

  /** Revierte el corte y devuelve los kilos a los rollos. */
  @Patch(':id/anular')
  anular(@Param('id') id: string, @Body() body: { motivo?: string }) {
    return this.servicio.anular(Number(id), body?.motivo);
  }
}
