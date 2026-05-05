export class CreateGuiaDto {
  correlativo!: string; // Ej: 'GUI-SAL-001'
  tipoGuia!: string;    // 'Salida' o 'Retorno'
  ordenId!: number;     // El ID de tu Orden (Ej: 1)
  tallerId!: number;    // El ID del Taller (Ej: 1)
  
  // Lo que va en los sacos
  detalles!: {
    color: string;
    talla: string;
    cantidadEnviada: number;
  }[];
}