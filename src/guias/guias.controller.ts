import { Controller, Get, Post, Body, Param, Res, UseGuards } from '@nestjs/common';
import * as express from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GuiasService } from './guias.service';
import { CreateGuiaDto } from './dto/create-guia.dto';
import { PdfService } from '../common/pdf.service'; // Asegúrate de haber creado este archivo
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Guías de Remisión y Documentos') // Organiza en Swagger
@ApiBearerAuth() // Candado de seguridad
@UseGuards(JwtAuthGuard, RolesGuard) // Exige el Token y rol
@Roles('ADMIN')
@Controller('guias')
export class GuiasController {
  // Aquí inyectamos AMBOS servicios: el de base de datos y el de PDFs
  constructor(
    private readonly guiasService: GuiasService,
    private readonly pdfService: PdfService 
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva Guía de Remisión' })
  create(@Body() createGuiaDto: CreateGuiaDto) {
    return this.guiasService.create(createGuiaDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las guías creadas' })
  findAll() {
    return this.guiasService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver detalles de una guía específica' })
  findOne(@Param('id') id: string) {
    return this.guiasService.findOne(+id);
  }

  // --- LA MAGIA DEL PDF ---
  @Get(':id/pdf')
  @ApiOperation({ summary: 'Descargar Guía de Remisión en PDF' })
  async descargarGuia(@Param('id') id: string, @Res() res: express.Response) {
    // Por ahora usamos datos de prueba. Más adelante, llamaremos a this.guiasService.findOne(id)
    const datosPrueba = {
      numeroGuia: `GR-00${id}`,
      tallerNombre: 'Taller San Juan - Juliaca',
      tallerDireccion: 'Jr. Huancané 123',
      prendas: [
        { cantidad: 50, nombre: 'Pantalón Cargo Hombre Negro', talla: '32', sku: 'P-CARG-01-32' },
        { cantidad: 50, nombre: 'Pantalón Cargo Hombre Negro', talla: '34', sku: 'P-CARG-01-34' },
        { cantidad: 30, nombre: 'Jean Slim Fit Azul', talla: 'M', sku: 'J-SLIM-02-M' },
        { cantidad: 20, nombre: 'Jean Slim Fit Azul', talla: 'L', sku: 'J-SLIM-02-L' }
      ]
    };

    // Llamamos a tu servicio para dibujar el PDF
    const buffer = await this.pdfService.generarGuiaRemision(datosPrueba);

    // Configuramos la cabecera para que tu navegador sepa que es una descarga
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=Guia_Remision_${id}.pdf`,
      'Content-Length': buffer.length,
    });

    res.end(buffer); // Enviamos el archivo terminado
  }
}