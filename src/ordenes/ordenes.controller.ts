import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdenesService } from './ordenes.service';
import { CreateOrdeneDto } from './dto/create-ordene.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('La Fábrica (Órdenes de Producción)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
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

  @Get('buscar/:codigo')
  @ApiOperation({ summary: 'Buscar una OP por su código (para Recepción de Taller)' })
  buscarPorCodigo(@Param('codigo') codigo: string) {
    return this.ordenesService.buscarPorCodigo(codigo);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver detalle y matriz de una Orden específica' })
  findOne(@Param('id') id: string) {
    return this.ordenesService.findOne(+id);
  }

  @Post(':id/recepcionar')
  @ApiOperation({ summary: 'Recepcionar prendas del taller y finalizar la OP (ingresa stock)' })
  recepcionar(@Param('id') id: string, @Body() body: any) {
    return this.ordenesService.recepcionar(+id, body);
  }

  // ==========================================
  // ACTUALIZAR ESTADO
  // Al pasar a "Terminada", el body puede incluir:
  //   - estado: "Terminada"
  //   - cantidadRealProducida: nº de prendas buenas que de verdad salieron
  //   - margenMayorista / margenMinorista (opcionales, para reajustar al cerrar)
  // ==========================================
  @Patch(':id/estado')
  @ApiOperation({ summary: 'Actualizar estado de la OP (Terminada con costo real, Anulada)' })
  actualizarEstado(@Param('id') id: string, @Body() body: any) {
    return this.ordenesService.actualizarEstado(+id, body.estado, body);
  }
}