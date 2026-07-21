import { Controller, Post, Body, Get, Param, Query, UseGuards } from '@nestjs/common';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard) // Requiere login (el vendedor registra ventas)
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

 @Get('reporte-general')
  obtenerReporteGeneral() {
    return this.ventasService.obtenerReporteGeneral();
  }

  @Get('escanear/:codigo')
  escanearCodigo(@Param('codigo') codigo: string) {
    return this.ventasService.buscarPorCodigoEscaner(codigo);
  }

  // --- CIERRE DE CAJA ---
  @Get('cierre-caja')
  cierreCaja(@Query('fecha') fecha?: string, @Query('bodegaId') bodegaId?: string) {
    return this.ventasService.cierreDeCaja(fecha, bodegaId ? Number(bodegaId) : undefined);
  }

  // --- DEVOLUCIONES / CAMBIOS ---
  @Get('buscar/:correlativo')
  buscarVenta(@Param('correlativo') correlativo: string) {
    return this.ventasService.buscarVentaPorCorrelativo(correlativo);
  }

  @Post('devolucion')
  registrarDevolucion(
    @Body() body: { ventaId: number; bodegaId: number; motivo?: string; items: { detalleId: number; cantidad: number }[] },
  ) {
    return this.ventasService.registrarDevolucion(body);
  }
}