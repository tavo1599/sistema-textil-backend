import { Controller, Get, Post, Body, UseGuards, Param, Put } from '@nestjs/common';
import { AlmacenTerminadosService } from './almacen-terminados.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard) // Protegemos la puerta con Token
@Controller('almacen-terminados')
export class AlmacenTerminadosController {
  constructor(private readonly almacenService: AlmacenTerminadosService) {}

  @Get('bodegas')
  getBodegas() { return this.almacenService.getBodegas(); }

  @Post('bodegas')
  createBodega(@Body() body: any) { return this.almacenService.createBodega(body); }

  @Get('inventario')
  getInventario() { return this.almacenService.getInventario(); }

  // 🔥 ESTA ES TU RUTA ORIGINAL PARA EL INGRESO CONTINUO 🔥
  // En tu Vue, asegúrate de que el botón de Guardar Ingreso llame a:
  // await api.post('/almacen-terminados/inventario', formIngreso.value);
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

  // ========================================================
  // 🌟 AQUÍ VAN LAS DOS RUTAS NUEVAS QUE ESTAMOS AGREGANDO 🌟
  // ========================================================

  // 1. Ruta para el botón "Deshacer" en el modal de ingreso
  @Post('revertir-ingreso')
  revertirIngreso(@Body() body: any) {
    return this.almacenService.revertirIngreso(body);
  }

  // 2. Ruta para el botón "Ajuste (⚙️)" en el Kardex principal
  @Post('ajustar-stock')
  ajustarStock(@Body() body: any) {
    return this.almacenService.ajustarStockManual(body);
  }
}