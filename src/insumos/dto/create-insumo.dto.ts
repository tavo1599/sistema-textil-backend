import { ApiProperty } from '@nestjs/swagger';

export class CreateInsumoDto {
  @ApiProperty({ example: 'TEL-DENIM-001', description: 'Código único' })
  codigo!: string; 

  @ApiProperty({ example: 'Tela Denim Stretch 12oz', description: 'Nombre completo' })
  nombre!: string; 

  @ApiProperty({ example: 'Tela', description: 'Puede ser: Tela, Avio, Empaque' })
  tipo!: string; 

  @ApiProperty({ example: 'Metros', description: 'Unidad MÍNIMA de uso (Metros, Unidad, Kg)' })
  unidadMedida!: string; 

  // --- AQUI ESTÁ LA MAGIA ---
  @ApiProperty({ example: 100, description: '¿Cuántos metros/unidades vinieron en tu compra?' })
  cantidadComprada!: number; 

  @ApiProperty({ example: 1200.50, description: '¿Cuánto pagaste en total por todo el paquete/rollo?' })
  precioTotalCompra!: number; 
}