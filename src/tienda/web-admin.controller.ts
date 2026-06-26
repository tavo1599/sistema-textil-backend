import {
  Controller, Get, Post, Put, Delete, Param, Body, UseGuards,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import { TiendaService } from './tienda.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MediaService } from '../media/media.service';

// Gestión de la tienda online — SOLO ADMIN.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('web')
export class WebAdminController {
  constructor(
    private readonly tiendaService: TiendaService,
    private readonly media: MediaService,
  ) {}

  // ===== PEDIDOS WEB =====
  @Get('pedidos')
  listarPedidos() {
    return this.tiendaService.listarPedidos();
  }

  @Put('pedidos/:id/estado')
  cambiarEstadoPedido(@Param('id') id: string, @Body('estado') estado: string) {
    return this.tiendaService.cambiarEstadoPedido(+id, estado);
  }

  // Confirmar pedido = convertirlo en venta real (descuenta stock)
  @Post('pedidos/:id/convertir')
  convertirPedido(@Param('id') id: string, @Body('bodegaId') bodegaId?: number) {
    return this.tiendaService.convertirPedidoEnVenta(+id, bodegaId);
  }

  // ===== CUPONES / CÓDIGOS PROMOCIONALES =====
  @Get('cupones')
  listarCupones() { return this.tiendaService.listarCupones(); }

  @Post('cupones')
  crearCupon(@Body() body: any) { return this.tiendaService.crearCupon(body); }

  @Put('cupones/:id')
  actualizarCupon(@Param('id') id: string, @Body() body: any) {
    return this.tiendaService.actualizarCupon(+id, body);
  }

  @Delete('cupones/:id')
  eliminarCupon(@Param('id') id: string) { return this.tiendaService.eliminarCupon(+id); }

  // ===== LIBRO DE RECLAMACIONES =====
  @Get('reclamaciones')
  listarReclamaciones() { return this.tiendaService.listarReclamaciones(); }

  @Put('reclamaciones/:id')
  responderReclamacion(@Param('id') id: string, @Body() body: any) {
    return this.tiendaService.responderReclamacion(+id, body);
  }

  // ===== RESEÑAS =====
  @Get('resenas')
  listarResenas() { return this.tiendaService.listarResenasAdmin(); }

  @Post('resenas')
  crearResena(@Body() body: any) { return this.tiendaService.crearResena(body); }

  @Put('resenas/:id')
  actualizarResena(@Param('id') id: string, @Body() body: any) {
    return this.tiendaService.actualizarResena(+id, body);
  }

  @Delete('resenas/:id')
  eliminarResena(@Param('id') id: string) { return this.tiendaService.eliminarResena(+id); }

  // ===== BANNER PROMOCIONAL =====
  @Get('banner')
  listarBanners() { return this.tiendaService.listarBannersAdmin(); }

  @Post('banner')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async crearBanner(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    const url = await this.media.guardar(file, 'portada');
    return this.tiendaService.crearBanner({
      url,
      titulo: body?.titulo || null,
      subtitulo: body?.subtitulo || null,
      textoBoton: body?.textoBoton || null,
      enlace: body?.enlace || null,
      orden: body?.orden != null ? Number(body.orden) : 0,
      activo: body?.activo !== undefined ? body.activo === 'true' || body.activo === true : true,
    });
  }

  @Put('banner/:id')
  actualizarBanner(@Param('id') id: string, @Body() body: any) {
    return this.tiendaService.actualizarBanner(+id, body);
  }

  @Delete('banner/:id')
  async eliminarBanner(@Param('id') id: string) {
    const lista = await this.tiendaService.listarBannersAdmin();
    const b = lista.find((x) => x.id === Number(id));
    if (b?.url) {
      const ruta = `.${b.url}`;
      if (fs.existsSync(ruta)) { try { fs.unlinkSync(ruta); } catch { /* ya no existe */ } }
    }
    return this.tiendaService.eliminarBanner(+id);
  }

  // ===== CONFIG (whatsapp, redes, contacto) =====
  @Get('config')
  obtenerConfig() { return this.tiendaService.obtenerConfig(); }

  @Put('config')
  guardarConfig(@Body() body: any) { return this.tiendaService.guardarConfig(body); }

  // Subir el logo de la tienda (imagen → WebP)
  @Post('logo')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async subirLogo(@UploadedFile() file: Express.Multer.File) {
    const url = await this.media.guardar(file, 'portada');
    await this.tiendaService.guardarLogo(url);
    return { url };
  }

  // Subir una de las 2 imágenes de "Nuestra historia" (slot = 1 o 2)
  @Post('historia/:slot')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async subirHistoria(@Param('slot') slot: string, @UploadedFile() file: Express.Multer.File) {
    const url = await this.media.guardar(file, 'portada');
    await this.tiendaService.guardarHistoriaImg(Number(slot), url);
    return { url };
  }

  // ===== PUBLICACIONES (tipo Instagram/reels) =====
  @Get('publicaciones')
  listarPublicaciones() {
    return this.tiendaService.listarPublicacionesAdmin();
  }

  @Post('publicaciones')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async crearPublicacion(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    const url = await this.media.guardar(file, 'portada');
    const esVideo = /^video\//.test(file.mimetype || '') || /\.(mp4|webm|ogg|mov)$/i.test(file.originalname || '');
    return this.tiendaService.crearPublicacion({
      tipo: body?.tipo || (esVideo ? 'video' : 'imagen'),
      url,
      caption: body?.caption || null,
      enlace: body?.enlace || null,
      orden: body?.orden != null ? Number(body.orden) : 0,
      activo: body?.activo !== undefined ? body.activo === 'true' || body.activo === true : true,
    });
  }

  @Put('publicaciones/:id')
  actualizarPublicacion(@Param('id') id: string, @Body() body: any) {
    return this.tiendaService.actualizarPublicacion(+id, body);
  }

  @Delete('publicaciones/:id')
  async eliminarPublicacion(@Param('id') id: string) {
    const lista = await this.tiendaService.listarPublicacionesAdmin();
    const pub = lista.find((p) => p.id === Number(id));
    if (pub?.url) {
      const ruta = `.${pub.url}`;
      if (fs.existsSync(ruta)) {
        try { fs.unlinkSync(ruta); } catch { /* ya no existe */ }
      }
    }
    return this.tiendaService.eliminarPublicacion(+id);
  }

  // ===== PORTADA =====
  // Lista todos los slides (activos e inactivos) para administrarlos
  @Get('portada')
  listar() {
    return this.tiendaService.listarPortadaAdmin();
  }

  // Sube un archivo (imagen o video) y crea el slide en un solo paso
  @Post('portada')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async crear(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    const url = await this.media.guardar(file, 'portada');
    // Detecta si es video por la extensión
    const esVideo = /^video\//.test(file.mimetype || '') || /\.(mp4|webm|ogg|mov)$/i.test(file.originalname || '');
    return this.tiendaService.crearSlide({
      tipo: body?.tipo || (esVideo ? 'video' : 'imagen'),
      url,
      titulo: body?.titulo || null,
      subtitulo: body?.subtitulo || null,
      enlace: body?.enlace || null,
      orden: body?.orden != null ? Number(body.orden) : 0,
      activo: body?.activo !== undefined ? body.activo === 'true' || body.activo === true : true,
    });
  }

  // Actualiza datos del slide (orden, título, activo, enlace...)
  @Put('portada/:id')
  actualizar(@Param('id') id: string, @Body() body: any) {
    return this.tiendaService.actualizarSlide(+id, body);
  }

  // Elimina el slide (y su archivo físico)
  @Delete('portada/:id')
  async eliminar(@Param('id') id: string) {
    const slides = await this.tiendaService.listarPortadaAdmin();
    const slide = slides.find((s) => s.id === Number(id));
    if (slide?.url) {
      const ruta = `.${slide.url}`;
      if (fs.existsSync(ruta)) {
        try { fs.unlinkSync(ruta); } catch { /* ya no existe */ }
      }
    }
    return this.tiendaService.eliminarSlide(+id);
  }
}
