export class CreateProductoDto {
  skuBase!: string;
  nombre!: string;
  categoria?: string;
  
  // Datos opcionales para la futura web
  publicadoWeb?: boolean;
  descripcionWeb?: string;
  imagenUrl?: string;
}