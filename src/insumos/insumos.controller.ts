import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards } from '@nestjs/common';
import { InsumosService } from './insumos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Ajusta la ruta si es necesario

@UseGuards(JwtAuthGuard)
@Controller('insumos')
export class InsumosController {
  constructor(private readonly insumosService: InsumosService) {}

  @Post()
  create(@Body() data: any) {
    return this.insumosService.create(data);
  }

  @Get()
  findAll() {
    return this.insumosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.insumosService.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.insumosService.update(+id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.insumosService.remove(+id);
  }
}