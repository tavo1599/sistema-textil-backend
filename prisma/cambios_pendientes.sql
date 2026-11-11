-- ###########################################################################
-- #  CAMBIOS PENDIENTES DE BASE DE DATOS                                    #
-- ###########################################################################
--
-- Este archivo lo aplica SOLO el script `prisma/aplicar-cambios.js`, que corre
-- automáticamente cuando arranca el contenedor (ver el CMD del Dockerfile).
-- No hace falta pegar nada a mano en ninguna terminal.
--
-- REGLAS PARA ESTE ARCHIVO (importantes si alguien agrega algo después):
--
--   1. Una sentencia por bloque, terminada en punto y coma.
--   2. SIEMPRE idempotente: IF NOT EXISTS en todo. Este archivo se ejecuta
--      en CADA arranque del contenedor, así que debe poder correr mil veces
--      sin cambiar nada la segunda vez.
--   3. SOLO cambios ADITIVOS: agregar columnas y tablas. Nunca DROP, nunca
--      RENAME, nunca cambiar un tipo de dato. Un cambio aditivo no rompe la
--      versión del backend que ya está corriendo.
--   4. NADA de bloques DO $$ ... $$. El ejecutor parte el archivo por punto
--      y coma y el dollar-quoting lo confundiría.
--   5. Las llaves foráneas van DENTRO del CREATE TABLE, no en un ALTER
--      aparte (ALTER TABLE ADD CONSTRAINT no admite IF NOT EXISTS).
--
-- ###########################################################################


-- ===========================================================================
-- BLOQUE A · LISTA DE PRECIOS EN Producto
-- ---------------------------------------------------------------------------
-- Las dos listas que usa la caja (minorista / mayorista). Esto es lo que
-- faltaba cuando salió el error "column Producto.precioMinorista does not exist".
-- ===========================================================================
ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "precioMinorista" DECIMAL(10,2) NOT NULL DEFAULT 0.00;

ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "precioMayorista" DECIMAL(10,2) NOT NULL DEFAULT 0.00;


-- ===========================================================================
-- BLOQUE B · MERCADERÍA COMPRADA
-- ---------------------------------------------------------------------------
-- esMercaderia = true  -> ropa comprada ya hecha. Se maneja GENERAL: solo
--                         cantidad, sin talla ni color.
-- codigoBarras         -> código corto numérico ('000123') para pegar y vender.
-- ===========================================================================
ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "esMercaderia" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "codigoBarras" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Producto_codigoBarras_key" ON "Producto"("codigoBarras");


-- ===========================================================================
-- BLOQUE C · ALMACÉN DE TELA EN ROLLOS
-- ---------------------------------------------------------------------------
-- Cada rollo físico es una fila. Si llegan 20 rollos, hay 20 filas: eso es lo
-- que permite que el cortador elija exactamente los que se lleva.
-- ===========================================================================
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
  CONSTRAINT "RolloTela_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RolloTela_proveedorId_fkey" FOREIGN KEY ("proveedorId")
    REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "RolloTela_insumoId_fkey" FOREIGN KEY ("insumoId")
    REFERENCES "Insumo"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "RolloTela_codigo_key" ON "RolloTela"("codigo");

CREATE INDEX IF NOT EXISTS "RolloTela_estado_idx" ON "RolloTela"("estado");

CREATE INDEX IF NOT EXISTS "RolloTela_color_idx" ON "RolloTela"("color");


-- ===========================================================================
-- BLOQUE D · HISTORIAL DE KILOS DE CADA ROLLO
-- ---------------------------------------------------------------------------
-- Para poder auditar por qué un rollo que entró con 25 kg hoy tiene 3 kg.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS "MovimientoRollo" (
  "id"             SERIAL        NOT NULL,
  "tipo"           TEXT          NOT NULL,
  "peso"           DECIMAL(10,3) NOT NULL,
  "pesoResultante" DECIMAL(10,3) NOT NULL,
  "motivo"         TEXT          NOT NULL,
  "referenciaId"   INTEGER,
  "fecha"          TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rolloId"        INTEGER       NOT NULL,
  CONSTRAINT "MovimientoRollo_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MovimientoRollo_rolloId_fkey" FOREIGN KEY ("rolloId")
    REFERENCES "RolloTela"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MovimientoRollo_rolloId_idx" ON "MovimientoRollo"("rolloId");


-- ===========================================================================
-- BLOQUE E · TRANSFORMACIÓN (el corte)
-- ---------------------------------------------------------------------------
-- Cabecera del "Reporte de Transformación / Producción": qué rollos se
-- llevó el cortador y en qué prendas los convirtió.
-- ===========================================================================
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
  CONSTRAINT "Transformacion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Transformacion_productoId_fkey" FOREIGN KEY ("productoId")
    REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Transformacion_tallerId_fkey" FOREIGN KEY ("tallerId")
    REFERENCES "ProveedorTaller"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Transformacion_codigo_key" ON "Transformacion"("codigo");

CREATE INDEX IF NOT EXISTS "Transformacion_estado_idx" ON "Transformacion"("estado");

CREATE INDEX IF NOT EXISTS "Transformacion_fecha_idx" ON "Transformacion"("fecha");


-- ===========================================================================
-- BLOQUE F · ROLLOS QUE ENTRARON A CADA CORTE
-- ===========================================================================
CREATE TABLE IF NOT EXISTS "TransformacionRollo" (
  "id"               SERIAL        NOT NULL,
  "pesoUsado"        DECIMAL(10,3) NOT NULL,
  "costoPorKilo"     DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
  "transformacionId" INTEGER       NOT NULL,
  "rolloId"          INTEGER       NOT NULL,
  CONSTRAINT "TransformacionRollo_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TransformacionRollo_transformacionId_fkey" FOREIGN KEY ("transformacionId")
    REFERENCES "Transformacion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TransformacionRollo_rolloId_fkey" FOREIGN KEY ("rolloId")
    REFERENCES "RolloTela"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "TransformacionRollo_transformacionId_rolloId_key" ON "TransformacionRollo"("transformacionId", "rolloId");


-- ===========================================================================
-- BLOQUE G · MATRIZ COLOR × TALLA DEL CORTE
-- ---------------------------------------------------------------------------
-- cantidad         = lo que se cortó
-- cantidadRecibida = lo que realmente volvió del taller
-- ===========================================================================
CREATE TABLE IF NOT EXISTS "TransformacionDetalle" (
  "id"               SERIAL  NOT NULL,
  "color"            TEXT    NOT NULL,
  "talla"            TEXT    NOT NULL,
  "cantidad"         INTEGER NOT NULL DEFAULT 0,
  "cantidadRecibida" INTEGER NOT NULL DEFAULT 0,
  "transformacionId" INTEGER NOT NULL,
  CONSTRAINT "TransformacionDetalle_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TransformacionDetalle_transformacionId_fkey" FOREIGN KEY ("transformacionId")
    REFERENCES "Transformacion"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "TransformacionDetalle_transformacionId_color_talla_key" ON "TransformacionDetalle"("transformacionId", "color", "talla");
