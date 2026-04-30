import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdenesService } from './ordenes.service';
import { CreateOrdeneDto } from './dto/create-ordene.dto'; // Revisa que el nombre coincida con tu archivo
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('La Fábrica (Órdenes de Producción)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ordenes')
export class OrdenesController {
  constructor(private readonly ordenesService: OrdenesService) {}

  @Post()
  @ApiOperation({ summary: 'Lanzar Orden de Producción (¡Esto descuenta insumos!)' })
  create(@Body() dto: CreateOrdeneDto) {
    return this.ordenesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las Órdenes en proceso' })
  findAll() {
    return this.ordenesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver detalle y matriz de una Orden específica' })
  findOne(@Param('id') id: string) {
    return this.ordenesService.findOne(+id);
  }
}