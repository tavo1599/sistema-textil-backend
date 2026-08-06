export class CreateProductoDto {
  skuBase!: string;
  nombre!: string;
  categoria?: string;

  // Listas de precio de la tienda física (las usa el punto de venta)
  precioMinorista?: number;
  precioMayorista?: number;

  // Datos opcionales para la futura web
  publicadoWeb?: boolean;
  descripcionWeb?: string;
  imagenUrl?: string;
  precioWeb?: number;
}