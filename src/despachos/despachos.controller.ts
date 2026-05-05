import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { DespachosService } from './despachos.service';

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