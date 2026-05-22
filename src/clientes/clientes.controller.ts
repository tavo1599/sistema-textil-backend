import { Controller, Get, Post, Body } from '@nestjs/common';
import { ClientesService } from './clientes.service';

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