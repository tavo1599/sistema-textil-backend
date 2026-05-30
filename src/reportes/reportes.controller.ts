import { Controller, Get, Query, UseGuards, SetMetadata } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@SetMetadata('roles', ['ADMIN'])
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Resumen general con inventario valorizado' })
  getDashboard() {
    return this.reportesService.obtenerResumenGeneral();
  }

  @Get('inventario-valorizado')
  @ApiOperation({ summary: 'Detalle del inventario valorizado a costo promedio' })
  getInventarioValorizado() {
    return this.reportesService.obtenerInventarioValorizado();
  }

  @Get('rentabilidad')
  @ApiOperation({ summary: 'Rentabilidad por período (ventas - costo)' })
  getRentabilidad(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.reportesService.obtenerRentabilidad(desde, hasta);
  }

  @Get('productos-rentables')
  @ApiOperation({ summary: 'Ranking de productos por utilidad' })
  getProductosRentables(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.reportesService.obtenerProductosRentables(desde, hasta);
  }

  @Get('cuentas-por-cobrar')
  @ApiOperation({ summary: 'Créditos pendientes y cuotas vencidas' })
  getCuentasPorCobrar() {
    return this.reportesService.obtenerCuentasPorCobrar();
  }

  @Get('kardex-valorizado')
  @ApiOperation({ summary: 'Kardex valorizado de una variante (producto+color+talla)' })
  getKardexValorizado(
    @Query('productoId') productoId: string,
    @Query('color') color: string,
    @Query('talla') talla: string,
    @Query('bodegaId') bodegaId?: string,
  ) {
    return this.reportesService.obtenerKardexValorizado(
      Number(productoId),
      color,
      talla,
      bodegaId ? Number(bodegaId) : undefined,
    );
  }
}