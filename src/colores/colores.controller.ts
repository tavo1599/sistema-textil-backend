import { Controller, Get, Post, Body } from '@nestjs/common';
import { ColoresService } from './colores.service';

@Controller('colores')
export class ColoresController {
  constructor(private readonly coloresService: ColoresService) {}

  @Get()
  findAll() {
    return this.coloresService.findAll();
  }

  @Post()
  create(@Body() body: { nombre: string; codigo: string; codigoHex?: string }) {
    return this.coloresService.create(body);
  }
}