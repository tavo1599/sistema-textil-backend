import { Controller, Get, Post, Body, Put, Param, Delete } from '@nestjs/common';
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

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.coloresService.update(+id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.coloresService.remove(+id);
  }
}