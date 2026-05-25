import { Controller, Post, Body, Get } from '@nestjs/common';
import { ComprasService } from './compras.service';

@Controller('compras')
export class ComprasController {
  constructor(private readonly comprasService: ComprasService) {}

  // Obtener lista de proveedores para el selector en Vue
  @Get('proveedores')
  obtenerProveedores() {
    return this.comprasService.obtenerProveedores();
  }

  // Recibir y procesar la compra completa
  @Post()
  crearCompra(@Body() data: any) {
    return this.comprasService.registrarCompra(data);
  }

  @Post('proveedores')
  crearProveedor(@Body() body: { ruc?: string; razonSocial: string; telefono?: string; tipo?: string }) {
    return this.comprasService.crearProveedor(body);
  }
}