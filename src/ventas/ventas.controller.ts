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
  // 2. ENDPOINT: LOGÍSTICA (Para el módulo de despachos)
  // ========================================================
  @Get('despachos-pendientes')
  obtenerDespachos() {
    return this.ventasService.obtenerDespachosPendientes();
  }

  // ========================================================
  // 3. NUEVO ENDPOINT: REPORTES (Para el Dashboard MVP)
  // ========================================================
  @Get('reporte-general')
  obtenerReporte() {
    return this.ventasService.obtenerReporteGeneral();
  }
}