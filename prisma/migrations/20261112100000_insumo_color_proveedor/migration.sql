-- Datos del ingreso físico en Insumo: color y proveedor.
-- Opcionales y solo informativos. Transformación sigue descontando de RolloTela.
-- Misma SQL que el Bloque H de prisma/cambios_pendientes.sql (lo que corre en producción).
ALTER TABLE "Insumo" ADD COLUMN IF NOT EXISTS "color" TEXT;
ALTER TABLE "Insumo" ADD COLUMN IF NOT EXISTS "proveedorId" INTEGER;
CREATE INDEX IF NOT EXISTS "Insumo_proveedorId_idx" ON "Insumo"("proveedorId");
