export class RetornoGuiaDto {
  guiaSalidaId!: number;   // La ID de la guía que enviamos antes
  correlativoRetorno!: string; // Ej: 'GUI-RET-001'
  
  detalles!: {
    colorId: number;
    tallaId: number;
    cantPrimera: number;  // Lo que está perfecto
    cantSegunda: number;  // Tiene arreglo pero se vende más barato
    cantFalla: number;    // No sirve
    cantFaltante: number; // Simplemente no llegó
  }[];
}