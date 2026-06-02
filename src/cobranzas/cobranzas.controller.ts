import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CobranzasService } from './cobranzas.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard) // Requiere login (ADMIN y VENDEDOR gestionan cobranzas)
@Controller('cobranzas')
export class CobranzasController {
  constructor(private readonly cobranzasService: CobranzasService) {}

  // GET: http://localhost:3000/cobranzas/deudores
  @Get('deudores')
  obtenerDeudores() {
    return this.cobranzasService.obtenerDeudores();
  }

  // POST: http://localhost:3000/cobranzas/abonar
  @Post('abonar')
  registrarAbono(
    @Body() data: { clienteId: number; monto: number; metodoPago: string; referencia?: string }
  ) {
    return this.cobranzasService.registrarAbono(data);
  }

  @Get('historial/:clienteId')
  obtenerHistorial(@Param('clienteId') clienteId: string) {
    return this.cobranzasService.obtenerHistorialPagos(Number(clienteId));
  }

  @Post('manual')
  registrarDeudaManual(@Body() body: { clienteId: number; monto: number; concepto: string }) {
    return this.cobranzasService.crearDeudaManual(body);
  }
}