export class CreateVentaDto {
  clienteNombre?: string; // Lo ponemos opcional por si es cliente de mostrador anónimo
  cliente?: string;       // Por compatibilidad si desde el front mandas 'cliente' en vez de 'clienteNombre'
  
  tipoVenta!: 'MAYORISTA' | 'MINORISTA' | 'WEB';
  almacenId!: number;
  
  // 🔥 NUEVOS CAMPOS DE LOGÍSTICA ACTUALIZADA 🔥
  metodoEntrega?: string; // 'ENTREGA_INMEDIATA' | 'RECOJO_TIENDA' | 'ENVIO_AGENCIA'
  requiereEnvio?: boolean; 
  destinoEnvio?: string;

  detalles!: {
    productoId: number;
    color: string;
    talla: string;
    cantidad: number;
    precioUnitario: number; 
  }[];
}