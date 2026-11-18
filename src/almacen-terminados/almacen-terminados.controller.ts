import { Controller, Get, Post, Body, UseGuards, Param, Put, Query, Req } from '@nestjs/common';
import { AlmacenTerminadosService } from './almacen-terminados.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { bodegasDelUsuario, filtroBodega } from '../common/bodegas-usuario';

// Login obligatorio. El vendedor puede CONSULTAR (GET) inventario/bodegas/movimientos,
// pero las operaciones que mueven o ajustan stock quedan restringidas a ADMIN.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('almacen-terminados')
export class AlmacenTerminadosController {
  // Aquí declaraste el servicio como "almacenService"
  constructor(
    private readonly almacenService: AlmacenTerminadosService,
    private readonly prisma: PrismaService,
  ) {}

  // Solo las bodegas que el usuario puede ver (todas para el ADMIN o quien no
  // tenga asignación). Así cada selector de almacén ya sale limitado.
  @Get('bodegas')
  async getBodegas(@Req() req: any) {
    const permitidas = await bodegasDelUsuario(this.prisma, req.user);
    return this.almacenService.getBodegas(permitidas);
  }

  @Post('bodegas')
  @Roles('ADMIN')
  createBodega(@Body() body: any) { return this.almacenService.createBodega(body); }

  // Inventario limitado a las bodegas del usuario; ?bodegaId para ver una sola.
  @Get('inventario')
  async getInventario(@Req() req: any, @Query('bodegaId') bodegaId?: string) {
    const permitidas = await bodegasDelUsuario(this.prisma, req.user);
    const filtro = filtroBodega(permitidas, bodegaId ? Number(bodegaId) : undefined);
    return this.almacenService.getInventario(filtro);
  }

  // El CONTEO FÍSICO lo hace también el vendedor: si en el mostrador aparece una
  // variante que el sistema no tenía (un color/talla nuevo), la crea desde ahí.
  @Post('inventario')
  @Roles('ADMIN', 'VENDEDOR')
  addInventario(@Body() body: any) { return this.almacenService.addInventario(body); }

  @Post('traslado')
  @Roles('ADMIN')
  realizarTraslado(@Body() body: any) {
    return this.almacenService.transferirInventario(body);
  }

  @Post('salida')
  @Roles('ADMIN')
  registrarSalida(@Body() body: any) {
    return this.almacenService.registrarSalida(body);
  }

  @Put('bodegas/:id')
  @Roles('ADMIN')
  updateBodega(@Param('id') id: string, @Body() body: any) {
    return this.almacenService.updateBodega(Number(id), body);
  }

  @Post('revertir-ingreso')
  @Roles('ADMIN')
  revertirIngreso(@Body() body: any) {
    return this.almacenService.revertirIngreso(body);
  }

  // Ajuste de inventario: es el guardado del CONTEO FÍSICO (corrige la cantidad
  // a lo que de verdad hay en el almacén). El vendedor que cuenta lo necesita.
  @Post('ajustar-stock')
  @Roles('ADMIN', 'VENDEDOR')
  ajustarStock(@Body() body: any) {
    return this.almacenService.ajustarStockManual(body);
  }

  @Get('movimientos')
  async obtenerMovimientos(
    @Query('productoId') productoId: string,
    @Query('bodegaId') bodegaId: string,
    @Query('color') color: string,
    @Query('talla') talla: string,
  ) {
    // 🔥 CORREGIDO: Ahora usa "this.almacenService"
    return this.almacenService.obtenerHistorialMovimientos(
      Number(productoId),
      Number(bodegaId),
      color,
      talla,
    );
  }
}