export class CreateLiquidationDto {
  ordenId!: number;
  costoServicioUnitario!: number; // Lo que cobra el taller por coser/lavar cada prenda
  otrosCostosAdicionales?: number; // Movilidad, hilos extras, etc.
}