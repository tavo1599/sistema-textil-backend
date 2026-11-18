-- Etapa Acabados en Transformación + avíos consumidos de Insumos.
-- Misma SQL que el Bloque K de prisma/cambios_pendientes.sql (lo de producción).
ALTER TABLE "Transformacion" ADD COLUMN IF NOT EXISTS "enAcabadosDesde" TIMESTAMP(3);
ALTER TABLE "TransformacionDetalle" ADD COLUMN IF NOT EXISTS "cantidadAcabados" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS "TransformacionAvio" (
  "id"               SERIAL PRIMARY KEY,
  "cantidad"         DECIMAL(12,4) NOT NULL,
  "costoUnitario"    DECIMAL(12,4) NOT NULL DEFAULT 0,
  "transformacionId" INTEGER NOT NULL,
  "insumoId"         INTEGER NOT NULL,
  CONSTRAINT "TransformacionAvio_transformacionId_fkey" FOREIGN KEY ("transformacionId")
    REFERENCES "Transformacion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TransformacionAvio_insumoId_fkey" FOREIGN KEY ("insumoId")
    REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "TransformacionAvio_transformacionId_idx" ON "TransformacionAvio"("transformacionId");
