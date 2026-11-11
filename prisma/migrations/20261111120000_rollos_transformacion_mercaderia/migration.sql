-- ============================================================================
-- ROLLOS DE TELA → TRANSFORMACIÓN → PRENDAS TERMINADAS  +  MERCADERÍA COMPRADA
-- ============================================================================
-- Escrita a mano y 100% IDEMPOTENTE: se puede correr varias veces sin romper
-- nada. No lleva el esquema escrito a la fuerza, así que respeta el search_path
-- (en local es 'textileria', en producción es 'public').
--
-- Cómo aplicarla en producción:
--   psql "$DATABASE_URL" -f prisma/migrations/20261111120000_rollos_transformacion_mercaderia/migration.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Producto: distinguir mercadería comprada y darle código de barras corto
-- ---------------------------------------------------------------------------
ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "esMercaderia" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "codigoBarras" TEXT;

DO $$ BEGIN
  CREATE UNIQUE INDEX "Producto_codigoBarras_key" ON "Producto"("codigoBarras");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 2. RolloTela
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "RolloTela" (
  "id"            SERIAL        NOT NULL,
  "codigo"        TEXT          NOT NULL,
  "descripcion"   TEXT,
  "color"         TEXT          NOT NULL,
  "colorCodigo"   TEXT,
  "pesoInicial"   DECIMAL(10,3) NOT NULL,
  "pesoActual"    DECIMAL(10,3) NOT NULL,
  "costoPorKilo"  DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
  "estado"        TEXT          NOT NULL DEFAULT 'DISPONIBLE',
  "fechaIngreso"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "observacion"   TEXT,
  "proveedorId"   INTEGER,
  "insumoId"      INTEGER,
  CONSTRAINT "RolloTela_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  CREATE UNIQUE INDEX "RolloTela_codigo_key" ON "RolloTela"("codigo");
EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX "RolloTela_estado_idx" ON "RolloTela"("estado");
EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX "RolloTela_color_idx" ON "RolloTela"("color");
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 3. MovimientoRollo (kardex de kilos)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "MovimientoRollo" (
  "id"             SERIAL        NOT NULL,
  "tipo"           TEXT          NOT NULL,
  "peso"           DECIMAL(10,3) NOT NULL,
  "pesoResultante" DECIMAL(10,3) NOT NULL,
  "motivo"         TEXT          NOT NULL,
  "referenciaId"   INTEGER,
  "fecha"          TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rolloId"        INTEGER       NOT NULL,
  CONSTRAINT "MovimientoRollo_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  CREATE INDEX "MovimientoRollo_rolloId_idx" ON "MovimientoRollo"("rolloId");
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 4. Transformacion (cabecera del corte)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Transformacion" (
  "id"                  SERIAL        NOT NULL,
  "codigo"              TEXT          NOT NULL,
  "fecha"               TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "estado"              TEXT          NOT NULL DEFAULT 'EN_PROCESO',
  "cortador"            TEXT,
  "observacion"         TEXT,
  "numeroGuia"          TEXT,
  "pesoTotalUsado"      DECIMAL(10,3) NOT NULL DEFAULT 0.000,
  "prendasPlanificadas" INTEGER       NOT NULL DEFAULT 0,
  "prendasRecibidas"    INTEGER       NOT NULL DEFAULT 0,
  "costoTelaTotal"      DECIMAL(14,4) NOT NULL DEFAULT 0.00,
  "productoId"          INTEGER       NOT NULL,
  "tallerId"            INTEGER,
  "bodegaDestinoId"     INTEGER,
  CONSTRAINT "Transformacion_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  CREATE UNIQUE INDEX "Transformacion_codigo_key" ON "Transformacion"("codigo");
EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX "Transformacion_estado_idx" ON "Transformacion"("estado");
EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX "Transformacion_fecha_idx" ON "Transformacion"("fecha");
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 5. TransformacionRollo (qué rollos entraron al corte)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "TransformacionRollo" (
  "id"               SERIAL        NOT NULL,
  "pesoUsado"        DECIMAL(10,3) NOT NULL,
  "costoPorKilo"     DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
  "transformacionId" INTEGER       NOT NULL,
  "rolloId"          INTEGER       NOT NULL,
  CONSTRAINT "TransformacionRollo_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  CREATE UNIQUE INDEX "TransformacionRollo_transformacionId_rolloId_key"
    ON "TransformacionRollo"("transformacionId", "rolloId");
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 6. TransformacionDetalle (matriz color × talla)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "TransformacionDetalle" (
  "id"               SERIAL  NOT NULL,
  "color"            TEXT    NOT NULL,
  "talla"            TEXT    NOT NULL,
  "cantidad"         INTEGER NOT NULL DEFAULT 0,
  "cantidadRecibida" INTEGER NOT NULL DEFAULT 0,
  "transformacionId" INTEGER NOT NULL,
  CONSTRAINT "TransformacionDetalle_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  CREATE UNIQUE INDEX "TransformacionDetalle_transformacionId_color_talla_key"
    ON "TransformacionDetalle"("transformacionId", "color", "talla");
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 7. Llaves foráneas (cada una protegida: si ya existe, no falla)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE "RolloTela" ADD CONSTRAINT "RolloTela_proveedorId_fkey"
    FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "RolloTela" ADD CONSTRAINT "RolloTela_insumoId_fkey"
    FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MovimientoRollo" ADD CONSTRAINT "MovimientoRollo_rolloId_fkey"
    FOREIGN KEY ("rolloId") REFERENCES "RolloTela"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Transformacion" ADD CONSTRAINT "Transformacion_productoId_fkey"
    FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Transformacion" ADD CONSTRAINT "Transformacion_tallerId_fkey"
    FOREIGN KEY ("tallerId") REFERENCES "ProveedorTaller"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TransformacionRollo" ADD CONSTRAINT "TransformacionRollo_transformacionId_fkey"
    FOREIGN KEY ("transformacionId") REFERENCES "Transformacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TransformacionRollo" ADD CONSTRAINT "TransformacionRollo_rolloId_fkey"
    FOREIGN KEY ("rolloId") REFERENCES "RolloTela"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TransformacionDetalle" ADD CONSTRAINT "TransformacionDetalle_transformacionId_fkey"
    FOREIGN KEY ("transformacionId") REFERENCES "Transformacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
