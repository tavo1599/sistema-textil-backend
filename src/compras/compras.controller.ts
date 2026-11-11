import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common';
import { ComprasService } from './compras.service';
import { MercaderiaService } from './mercaderia.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('compras')
export class ComprasController {
  constructor(
    private readonly comprasService: ComprasService,
    private readonly mercaderia: MercaderiaService,
  ) {}

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

  // =======================================================================
  // MERCADERÍA COMPRADA (compra simplificada, sin talla ni color)
  // =======================================================================

  /** Catálogo de mercadería con su stock, su precio y su código de barras. */
  @Get('mercaderia/catalogo')
  catalogoMercaderia() {
    return this.mercaderia.catalogo();
  }

  /** Historial de compras de mercadería. */
  @Get('mercaderia/historial')
  historialMercaderia(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.mercaderia.historial({ desde, hasta });
  }

  /** Registra la compra: nombre, cantidad, costo, precio de venta y factura. */
  @Post('mercaderia')
  registrarMercaderia(@Body() body: any) {
    return this.mercaderia.registrar(body);
  }

  /** Le pone código de barras a la mercadería antigua que no lo tenía. */
  @Post('mercaderia/codigos')
  asignarCodigos() {
    return this.mercaderia.asignarCodigosFaltantes();
  }
}
