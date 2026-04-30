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
}