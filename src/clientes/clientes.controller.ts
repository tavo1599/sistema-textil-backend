import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard) // Requiere login (el vendedor registra clientes al vender)
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  // GET: http://localhost:3000/clientes
  @Get()
  findAll() {
    return this.clientesService.findAll();
  }

  // POST: http://localhost:3000/clientes
  @Post()
  create(@Body() data: { nombre: string; documento?: string; limiteCredito: number }) {
    return this.clientesService.create(data);
  }
}