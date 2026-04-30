export class CreateVentaDto {
  clienteNombre!: string;
  tipoVenta!: 'MAYORISTA' | 'MINORISTA' | 'WEB';
  almacenId!: number;
  detalles!: {
    productoId: number;
    colorId: number;
    tallaId: number;
    cantidad: number;
    precioUnitario: number; // El precio final pactado
  }[];
}