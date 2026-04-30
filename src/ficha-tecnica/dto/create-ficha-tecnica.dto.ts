import { ApiProperty } from '@nestjs/swagger';

export class CreateFichaTecnicaDto {
  @ApiProperty({ example: 1, description: 'ID del Producto (Ej: Pantalón Cargo)' })
  productoId!: number;

  @ApiProperty({ example: 2, description: 'ID del Insumo (Ej: Tela Denim)' })
  insumoId!: number;

  @ApiProperty({ example: 1.20, description: 'Cantidad neta en la prenda (metros/unidades)' })
  cantidadRequerida!: number;

  @ApiProperty({ 
    example: 5, 
    description: 'Porcentaje de merma al cortar (Ej: 5 para 5%)',
    required: false,
    default: 0 
  })
  mermaEstimadaPct?: number;
}