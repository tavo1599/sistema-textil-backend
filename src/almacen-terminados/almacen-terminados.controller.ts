import { Controller, Get, Post, Body, UseGuards, Param, Put, Query } from '@nestjs/common';
import { AlmacenTerminadosService } from './almacen-terminados.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

// Login obligatorio. El vendedor puede CONSULTAR (GET) inventario/bodegas/movimientos,
// pero las operaciones que mueven o ajustan stock quedan restringidas a ADMIN.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('almacen-terminados')
export class AlmacenTerminadosController {
  // Aquí declaraste el servicio como "almacenService"
  constructor(private readonly almacenService: AlmacenTerminadosService) {}

  @Get('bodegas')
  getBodegas() { return this.almacenService.getBodegas(); }

  @Post('bodegas')
  @Roles('ADMIN')
  createBodega(@Body() body: any) { return this.almacenService.createBodega(body); }

  @Get('inventario')
  getInventario() { return this.almacenService.getInventario(); }

  @Post('inventario')
  @Roles('ADMIN')
  addInventario(@Body() body: any) { return this.almacenService.addInventario(body); }

  @Post('traslado')
  @Roles('ADMIN')
  realizarTraslado(@Body() body: any) {
    return this.almacenService.transferirInventario(body);
  }

  @Post('salida')
  @Roles('ADMIN')
  registrarSalida(@Body() body: any) {
    return this.almacenService.registrarSalida(body);
  }

  @Put('bodegas/:id')
  @Roles('ADMIN')
  updateBodega(@Param('id') id: string, @Body() body: any) {
    return this.almacenService.updateBodega(Number(id), body);
  }

  @Post('revertir-ingreso')
  @Roles('ADMIN')
  revertirIngreso(@Body() body: any) {
    return this.almacenService.revertirIngreso(body);
  }

  @Post('ajustar-stock')
  @Roles('ADMIN')
  ajustarStock(@Body() body: any) {
    return this.almacenService.ajustarStockManual(body);
  }

  @Get('movimientos')
  async obtenerMovimientos(
    @Query('productoId') productoId: string,
    @Query('bodegaId') bodegaId: string,
    @Query('color') color: string,
    @Query('talla') talla: string,
  ) {
    // 🔥 CORREGIDO: Ahora usa "this.almacenService"
    return this.almacenService.obtenerHistorialMovimientos(
      Number(productoId),
      Number(bodegaId),
      color,
      talla,
    );
  }
}