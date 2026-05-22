export class CreateVentaDto {
  clienteNombre?: string; // Lo ponemos opcional por si es cliente de mostrador anónimo
  cliente?: string;       // Por compatibilidad si desde el front mandas 'cliente' en vez de 'clienteNombre'
  
  tipoVenta!: 'MAYORISTA' | 'MINORISTA' | 'WEB';
  almacenId!: number;
  
  // 🔥 CAMPOS DE LOGÍSTICA ACTUALIZADA 🔥
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

  // ==========================================
  // 💰 NUEVOS CAMPOS FINANCIEROS (CRÉDITOS)
  // ==========================================
  
  // Condición de pago. Si no se envía, el backend asume 'CONTADO'
  condicionPago?: 'CONTADO' | 'CREDITO_ESTRICTO' | 'CREDITO_FLEXIBLE';
  
  // ID del cliente mayorista (obligatorio solo si es crédito)
  clienteId?: number; 
  
  // Cuánto dinero dejó en caja al momento de la venta
  adelanto?: number; 
  
  // En cuántas partes se divide la deuda (ej: 4)
  numeroCuotas?: number; 
  
  // Cada cuánto tiempo se vence una cuota
  frecuenciaPago?: 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';
}