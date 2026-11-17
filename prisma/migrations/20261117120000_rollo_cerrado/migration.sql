-- Rollos cerrados: un rollo en 0 kg cuya producción ya llegó al almacén sale
-- del almacén de tela sin borrarse (el código no se reusa y el costo de las
-- prendas que produjo sigue trazable).
-- Misma SQL que el Bloque I de prisma/cambios_pendientes.sql (lo que corre en producción).
ALTER TABLE "RolloTela" ADD COLUMN IF NOT EXISTS "cerradoEn" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "RolloTela_cerradoEn_idx" ON "RolloTela"("cerradoEn");

UPDATE "RolloTela" r
   SET "cerradoEn" = now()
 WHERE r."cerradoEn" IS NULL
   AND r."estado" <> 'ANULADO'
   AND r."pesoActual" <= 0
   AND NOT EXISTS (
     SELECT 1
       FROM "TransformacionRollo" tr
       JOIN "Transformacion" t ON t."id" = tr."transformacionId"
      WHERE tr."rolloId" = r."id"
        AND t."estado" IN ('EN_PROCESO', 'PARCIAL')
   );
