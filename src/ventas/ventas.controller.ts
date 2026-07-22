import { Controller, Post, Body, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
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
  create(@Body() createVentaDto: CreateVentaDto, @Req() req: any) {
    // Guardamos quién registró la venta (sale del token)
    return this.ventasService.registrarVenta({ ...createVentaDto, usuarioId: req.user?.id });
  }

  // ========================================================
  // 2. ENDPOINT: LOGÍSTICA (Para el módulo de despachos)
  // ========================================================
  @Get('despachos-pendientes')
  obtenerDespachos() {
    return this.ventasService.obtenerDespachosPendientes();
  }

 @Get('reporte-general')
  obtenerReporteGeneral(@Query('fecha') fecha?: string) {
    return this.ventasService.obtenerReporteGeneral(fecha);
  }

  @Get('escanear/:codigo')
  escanearCodigo(@Param('codigo') codigo: string) {
    return this.ventasService.buscarPorCodigoEscaner(codigo);
  }

  // Detalle completo de una venta (modal del reporte)
  @Get('detalle/:id')
  obtenerDetalleVenta(@Param('id') id: string) {
    return this.ventasService.obtenerDetalleVenta(Number(id));
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

  @Post('cambio')
  registrarCambio(@Body() body: any) {
    return this.ventasService.registrarCambio(body);
  }

  @Post('devolucion')
  registrarDevolucion(
    @Body() body: { ventaId: number; bodegaId: number; motivo?: string; items: { detalleId: number; cantidad: number }[] },
  ) {
    return this.ventasService.registrarDevolucion(body);
  }
}