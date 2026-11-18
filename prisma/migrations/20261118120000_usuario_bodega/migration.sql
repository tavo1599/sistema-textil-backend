-- Almacenes (bodegas) por usuario: un usuario con filas aquí solo ve esas
-- bodegas; sin filas ve todas; el ADMIN siempre ve todas.
-- Misma SQL que el Bloque J de prisma/cambios_pendientes.sql (lo de producción).
CREATE TABLE IF NOT EXISTS "UsuarioBodega" (
  "id"        SERIAL PRIMARY KEY,
  "usuarioId" INTEGER NOT NULL,
  "bodegaId"  INTEGER NOT NULL,
  CONSTRAINT "UsuarioBodega_usuarioId_fkey" FOREIGN KEY ("usuarioId")
    REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UsuarioBodega_bodegaId_fkey" FOREIGN KEY ("bodegaId")
    REFERENCES "Bodega"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "UsuarioBodega_usuarioId_bodegaId_key" ON "UsuarioBodega"("usuarioId", "bodegaId");
CREATE INDEX IF NOT EXISTS "UsuarioBodega_usuarioId_idx" ON "UsuarioBodega"("usuarioId");
CREATE INDEX IF NOT EXISTS "UsuarioBodega_bodegaId_idx" ON "UsuarioBodega"("bodegaId");
