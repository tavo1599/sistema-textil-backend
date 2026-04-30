import { Controller, Post, UseInterceptors, UploadedFile, Param, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// Si marcas error en fs, importa así: import * as fs from 'fs';
import * as fs from 'fs';

@ApiTags('Archivos e Imágenes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('archivos')
export class ArchivosController {
  constructor(private prisma: PrismaService) {}

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
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const path = './uploads/productos';
        if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });
        cb(null, path);
      },
      filename: (req, file, cb) => {
        // Genera un nombre único: prod-123456789.jpg
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `prod-${uniqueSuffix}${extname(file.originalname)}`);
      }
    })
  }))
  async subirImagenProducto(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    const urlLocal = `/uploads/productos/${file.filename}`;
    
    // Guardamos la ruta en la base de datos
    await this.prisma.producto.update({
      where: { id: Number(id) },
      data: { imagenLocal: urlLocal }
    });

    return { mensaje: 'Imagen subida correctamente', url: urlLocal };
  }
}