import { Controller, Get, Post, Body, UseGuards, Param, Put, Query } from '@nestjs/common';
import { AlmacenTerminadosService } from './almacen-terminados.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard) // Protegemos la puerta con Token
@Controller('almacen-terminados')
export class AlmacenTerminadosController {
  // Aquí declaraste el servicio como "almacenService"
  constructor(private readonly almacenService: AlmacenTerminadosService) {}

  @Get('bodegas')
  getBodegas() { return this.almacenService.getBodegas(); }

  @Post('bodegas')
  createBodega(@Body() body: any) { return this.almacenService.createBodega(body); }

  @Get('inventario')
  getInventario() { return this.almacenService.getInventario(); }

  @Post('inventario')
  addInventario(@Body() body: any) { return this.almacenService.addInventario(body); }

  @Post('traslado')
  realizarTraslado(@Body() body: any) { 
    return this.almacenService.transferirInventario(body); 
  }

  @Post('salida')
  registrarSalida(@Body() body: any) { 
    return this.almacenService.registrarSalida(body); 
  }

  @Put('bodegas/:id')
  updateBodega(@Param('id') id: string, @Body() body: any) { 
    return this.almacenService.updateBodega(Number(id), body); 
  }

  @Post('revertir-ingreso')
  revertirIngreso(@Body() body: any) {
    return this.almacenService.revertirIngreso(body);
  }

  @Post('ajustar-stock')
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