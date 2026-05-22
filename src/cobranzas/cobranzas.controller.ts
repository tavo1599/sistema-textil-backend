import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CobranzasService } from './cobranzas.service';

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
}