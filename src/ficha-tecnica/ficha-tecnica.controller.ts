import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { FichaTecnicaService } from './ficha-tecnica.service';
import { CreateFichaTecnicaDto } from './dto/create-ficha-tecnica.dto';

@Controller('ficha-tecnica')
export class FichaTecnicaController {
  constructor(private readonly fichaTecnicaService: FichaTecnicaService) {}

  @Post()
  create(@Body() createFichaTecnicaDto: CreateFichaTecnicaDto) {
    return this.fichaTecnicaService.create(createFichaTecnicaDto);
  }

  // Ruta especial para ver la receta de un producto específico
  // Ejemplo: GET /ficha-tecnica/producto/1
  @Get('producto/:productoId')
  findPorProducto(@Param('productoId') productoId: string) {
    return this.fichaTecnicaService.findPorProducto(+productoId);
  }
}