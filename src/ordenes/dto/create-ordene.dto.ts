import { ApiProperty } from '@nestjs/swagger';

// 1. Creamos el "molde" para la curvita de tallas
export class DetalleOrdenDto {
  @ApiProperty({ example: 1, description: 'ID del Color (Ej: 1 = Azul Marino)' })
  colorId!: number;

  @ApiProperty({ example: 3, description: 'ID de la Talla (Ej: 3 = Talla L)' })
  tallaId!: number;

  @ApiProperty({ example: 50, description: 'Cantidad a coser de esta talla/color' })
  cantidad!: number;
}

// 2. Tu DTO principal usando el molde de arriba
export class CreateOrdeneDto {
  @ApiProperty({ example: 'OP-2026-001', description: 'Código único de la Orden' })
  codigoOp!: string; 

  @ApiProperty({ example: 1, description: 'ID del Producto (Ej: Jean Slim Fit)' })
  productoId!: number;

  // Así le decimos a Swagger: "Aquí viene una lista de detalles"
  @ApiProperty({ type: [DetalleOrdenDto], description: 'Matriz de colores y tallas' })
  detalles!: DetalleOrdenDto[];
}