-- ============================================================
-- HOTFIX PRODUCCIÓN: columnas de lista de precios en Producto
-- ============================================================
-- La BD de producción se creó con `prisma db push` y no tiene historial de
-- migraciones, por eso `migrate deploy` no sirve aquí. Este ALTER es el
-- equivalente exacto de la migración 20260806161108_precios_mayorista_minorista.
--
-- Es aditivo y con DEFAULT: no bloquea la tabla de forma prolongada en
-- PostgreSQL 11+, no borra datos y no rompe nada que ya esté funcionando.
-- El `IF NOT EXISTS` lo hace seguro de correr más de una vez.
--
-- Ejecutar con:
--   psql "<DATABASE_URL_DE_PRODUCCION>" -f hotfix_precios_produccion.sql

ALTER TABLE "public"."Producto"
  ADD COLUMN IF NOT EXISTS "precioMinorista" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS "precioMayorista" DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- Verificación: debe devolver las dos filas nuevas.
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'Producto'
  AND column_name IN ('precioMinorista', 'precioMayorista');
