import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ComprasService } from './compras.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
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