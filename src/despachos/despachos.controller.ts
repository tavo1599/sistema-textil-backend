import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { DespachosService } from './despachos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('despachos')
export class DespachosController {
  constructor(private readonly despachosService: DespachosService) {}

  @Get('pendientes')
  obtenerPendientes() {
    return this.despachosService.obtenerPendientes();
  }

  // Ruta secreta para que puedas insertar datos de prueba rápido desde el navegador
  @Post('crear-prueba')
  crearDatoPrueba() {
    return this.despachosService.crearPrueba();
  }

  @Patch(':id/estado')
  actualizarEstado(@Param('id') id: string, @Body('estado') estado: string) {
    return this.despachosService.actualizarEstado(Number(id), estado);
  }
}