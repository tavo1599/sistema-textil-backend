import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RollosService } from './rollos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('rollos')
export class RollosController {
  constructor(private readonly rollos: RollosService) {}

  /** Tarjetas de resumen: kilos disponibles, valor, kilos por color. */
  @Get('resumen')
  resumen() {
    return this.rollos.resumen();
  }

  /** Solo los rollos que todavía tienen tela (los que puede elegir el cortador). */
  @Get('disponibles')
  disponibles() {
    return this.rollos.disponibles();
  }

  /** Listado con filtros: ?estado=DISPONIBLE&color=Negro&proveedorId=3 */
  @Get()
  listar(
    @Query('estado') estado?: string,
    @Query('color') color?: string,
    @Query('proveedorId') proveedorId?: string,
  ) {
    return this.rollos.listar({
      estado,
      color,
      proveedorId: proveedorId ? Number(proveedorId) : undefined,
    });
  }

  /** Historial de kilos de un rollo + en qué cortes se usó. */
  @Get(':id/historial')
  historial(@Param('id') id: string) {
    return this.rollos.historial(Number(id));
  }

  /** Registra uno o varios rollos del mismo color de una sola vez. */
  @Post()
  registrar(@Body() body: any) {
    return this.rollos.registrar(body);
  }

  /** Corrige el peso de un rollo (reconteo en balanza o tela devuelta). */
  @Patch(':id/peso')
  ajustarPeso(@Param('id') id: string, @Body() body: { pesoReal: number; motivo?: string }) {
    return this.rollos.ajustarPeso(Number(id), body);
  }

  /** Anula un rollo registrado por error (solo si nunca se usó). */
  @Patch(':id/anular')
  anular(@Param('id') id: string, @Body() body: { motivo?: string }) {
    return this.rollos.anular(Number(id), body?.motivo);
  }
}
