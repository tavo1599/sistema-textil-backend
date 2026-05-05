export class CreateVentaDto {
  clienteNombre!: string;
  tipoVenta!: 'MAYORISTA' | 'MINORISTA' | 'WEB';
  almacenId!: number;
  
  // 👇 ¡NUEVOS CAMPOS PARA CONECTAR CON DESPACHOS! 👇
  requiereEnvio!: boolean; 
  destinoEnvio?: string; // Es opcional (?) porque si no requiere envío, no hay destino
  // 👆 ------------------------------------------- 👆

  detalles!: {
    productoId: number;
    color: string;
    talla: string;
    cantidad: number;
    precioUnitario: number; // El precio final pactado
  }[];
}