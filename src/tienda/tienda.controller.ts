import { Controller, Get, Post, Param, Query, Body, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TiendaService } from './tienda.service';
import { MediaService } from '../media/media.service';

// 🌐 RUTAS PÚBLICAS (sin login) para la tienda online.
// No llevan JwtAuthGuard: cualquiera puede ver el catálogo.
@Controller('tienda')
export class TiendaController {
  constructor(
    private readonly tiendaService: TiendaService,
    private readonly media: MediaService,
  ) {}

  @Get('productos')
  listar(@Query('categoria') categoria?: string, @Query('q') q?: string) {
    return this.tiendaService.listarCatalogo({ categoria, q });
  }

  @Get('categorias')
  categorias() {
    return this.tiendaService.listarCategorias();
  }

  @Get('portada')
  portada() {
    return this.tiendaService.listarPortadaPublica();
  }

  @Get('publicaciones')
  publicaciones() {
    return this.tiendaService.listarPublicacionesPublicas();
  }

  @Get('resenas')
  resenas() {
    return this.tiendaService.listarResenasPublicas();
  }

  @Get('banner')
  banner() {
    return this.tiendaService.listarBannersPublicos();
  }

  @Get('config')
  config() {
    return this.tiendaService.obtenerConfig();
  }

  @Get('producto/:id')
  detalle(@Param('id') id: string) {
    return this.tiendaService.obtenerProducto(+id);
  }

  // Cliente finaliza su compra (público, sin login).
  // Acepta el voucher de pago como archivo (multipart). 'items' llega como JSON string.
  @Post('pedido')
  @UseInterceptors(FileInterceptor('voucher'))
  async crearPedido(@UploadedFile() voucher: Express.Multer.File, @Body() body: any) {
    const items = typeof body.items === 'string' ? JSON.parse(body.items) : body.items;
    const voucherUrl = voucher ? await this.media.guardar(voucher, 'vouchers') : null;
    return this.tiendaService.crearPedido({ ...body, items, voucherUrl });
  }

  // Seguimiento del pedido (público, requiere código + teléfono)
  @Post('seguimiento')
  seguimiento(@Body() body: any) {
    return this.tiendaService.seguimiento(body.codigo, body.telefono);
  }

  // Libro de Reclamaciones (público)
  @Post('reclamacion')
  crearReclamacion(@Body() body: any) {
    return this.tiendaService.crearReclamacion(body);
  }

  // Validar un código promocional (público, para mostrar el descuento en el carrito)
  @Post('cupon/validar')
  validarCupon(@Body() body: any) {
    return this.tiendaService.validarCupon(body.codigo, body.subtotal);
  }
}
