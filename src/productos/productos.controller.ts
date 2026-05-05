import { Controller, Get, Post, Body, Param, UseGuards, Delete, Put } from '@nestjs/common';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard) // 🛡️ Protegemos las rutas con el Token
@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  // 1. Crear el modelo base (Nombre, SKU)
  @Post()
  create(@Body() createProductoDto: CreateProductoDto) {
    return this.productosService.create(createProductoDto);
  }

  // 2. NUEVO: Registrar la Ficha Técnica Completa (BOM + Ruta)
  @Post(':id/ficha-tecnica')
  async saveFichaTecnica(
    @Param('id') id: string, 
    @Body() data: any // Recibimos todo el paquete completo desde Vue
  ) {
    // Le pasamos el paquete completo al servicio para que él lo procese
    return this.productosService.saveFichaTecnica(+id, data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.productosService.update(+id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productosService.remove(+id); // El símbolo + convierte el string a número
  }

  // 3. Listar todos los productos (Para los selects de Vue)
  @Get()
  findAll() {
    return this.productosService.findAll();
  }

  // 4. Ver un producto específico con su ficha técnica incluida
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productosService.findOne(+id);
  }
}