import { Controller, Post, Get, Delete, Body, UseInterceptors, UploadedFile, Param, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MediaService } from '../media/media.service';
import * as fs from 'fs';

@ApiTags('Archivos e Imágenes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('archivos')
export class ArchivosController {
  constructor(
    private prisma: PrismaService,
    private media: MediaService,
  ) {}

  @Post('producto/:id')
  @ApiOperation({ summary: 'Subir foto interna del producto' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Selecciona la imagen del pantalón/prenda'
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async subirImagenProducto(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    // MediaService convierte a WebP optimizado
    const urlLocal = await this.media.guardar(file, 'productos');

    await this.prisma.producto.update({
      where: { id: Number(id) },
      data: { imagenLocal: urlLocal }
    });

    return { mensaje: 'Imagen subida correctamente', url: urlLocal };
  }

  // =========================================================
  // GALERÍA POR COLOR (tienda online)
  // =========================================================

  // Subir una foto a la galería del producto, opcionalmente asociada a un color.
  // form-data: file (binario), color (texto opcional), orden (número opcional)
  @Post('producto/:id/galeria')
  @ApiOperation({ summary: 'Subir foto a la galería del producto (por color)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async subirImagenGaleria(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    const url = await this.media.guardar(file, 'productos');
    const imagen = await this.prisma.productoImagen.create({
      data: {
        productoId: Number(id),
        url,
        color: body?.color ? String(body.color) : null,
        orden: body?.orden != null ? Number(body.orden) : 0,
      },
    });
    return { mensaje: 'Foto agregada a la galería', imagen };
  }

  // Listar la galería de un producto (para el admin)
  @Get('producto/:id/galeria')
  @ApiOperation({ summary: 'Listar la galería de imágenes de un producto' })
  async listarGaleria(@Param('id') id: string) {
    return this.prisma.productoImagen.findMany({
      where: { productoId: Number(id) },
      orderBy: [{ color: 'asc' }, { orden: 'asc' }],
    });
  }

  // Colores que esta prenda tiene en almacén (para limitar el selector al subir foto)
  @Get('producto/:id/colores')
  @ApiOperation({ summary: 'Colores existentes en inventario de un producto' })
  async coloresProducto(@Param('id') id: string) {
    const rows = await this.prisma.inventarioTerminado.findMany({
      where: { productoId: Number(id) },
      select: { color: true },
      distinct: ['color'],
    });
    const colores = await this.prisma.color.findMany({
      select: { nombre: true, codigo: true, codigoHex: true },
    });
    const norm = (s: any) =>
      String(s ?? '').trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return rows.map((r) => {
      const c = colores.find((x) => norm(x.codigo) === norm(r.color) || norm(x.nombre) === norm(r.color));
      return { valor: r.color, nombre: c?.nombre || r.color, hex: c?.codigoHex || null };
    });
  }

  // Borrar una imagen de la galería (también borra el archivo físico)
  @Delete('imagen/:imagenId')
  @ApiOperation({ summary: 'Eliminar una imagen de la galería' })
  async borrarImagen(@Param('imagenId') imagenId: string) {
    const imagen = await this.prisma.productoImagen.findUnique({
      where: { id: Number(imagenId) },
    });
    if (imagen) {
      const ruta = `.${imagen.url}`;
      if (fs.existsSync(ruta)) {
        try { fs.unlinkSync(ruta); } catch { /* archivo ya no existe */ }
      }
      await this.prisma.productoImagen.delete({ where: { id: Number(imagenId) } });
    }
    return { mensaje: 'Imagen eliminada' };
  }
}