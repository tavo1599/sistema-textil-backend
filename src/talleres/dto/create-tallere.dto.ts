export class CreateTallereDto {
  razonSocial!: string; // Ej: 'Confecciones Los Hermanos SAC'
  tipo!: string;        // Ej: 'Confeccion', 'Lavanderia', 'Corte'
  telefono?: string;    // Opcional
}