import { Controller, Post, Body, Get } from '@nestjs/common';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';

@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  // ========================================================
  // 1. ENDPOINT DE VENTAS (El que consume la Laptop/Caja)
  // ========================================================
  @Post()
  create(@Body() createVentaDto: CreateVentaDto) {
    return this.ventasService.registrarVenta(createVentaDto);
  }

  // ========================================================
  // 2. NUEVO ENDPOINT: LOGÍSTICA (Para el módulo de despachos)
  // ========================================================
  @Get('despachos-pendientes')
  obtenerDespachos() {
    return this.ventasService.obtenerDespachosPendientes();
  }

 @Get('reporte-general')
  obtenerReporteGeneral() {
    return this.ventasService.obtenerReporteGeneral();
  }
}