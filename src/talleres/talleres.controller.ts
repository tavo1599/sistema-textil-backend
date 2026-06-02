import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards } from '@nestjs/common';
import { TalleresService } from './talleres.service';
import { CreateTallereDto } from './dto/create-tallere.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('talleres')
export class TalleresController {
  constructor(private readonly talleresService: TalleresService) {}

  @Post()
  create(@Body() createTallereDto: CreateTallereDto) {
    return this.talleresService.create(createTallereDto);
  }

  @Get()
  findAll() {
    return this.talleresService.findAll();
  }

  // RUTA PARA ACTUALIZAR (NUEVO)
  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    // El símbolo '+' convierte el string del id de la URL a número
    return this.talleresService.update(+id, body);
  }

  // RUTA PARA ELIMINAR (NUEVO)
  @Delete(':id')
  remove(@Param('id') id: string) {
    // El símbolo '+' convierte el string del id de la URL a número
    return this.talleresService.remove(+id);
  }
}