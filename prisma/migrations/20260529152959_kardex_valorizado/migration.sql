-- AlterTable
ALTER TABLE "MovimientoInventario" ADD COLUMN     "costoTotal" DECIMAL(14,4),
ADD COLUMN     "costoUnitario" DECIMAL(12,4),
ADD COLUMN     "saldoCantidad" INTEGER,
ADD COLUMN     "saldoCostoProm" DECIMAL(12,4),
ADD COLUMN     "saldoValor" DECIMAL(14,4);

-- CreateTable
CREATE TABLE "CostoPromedioProducto" (
    "id" SERIAL NOT NULL,
    "productoId" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'N/A',
    "talla" TEXT NOT NULL DEFAULT 'N/A',
    "costoPromedio" DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
    "stockValorado" INTEGER NOT NULL DEFAULT 0,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostoPromedioProducto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proveedor" (
    "id" SERIAL NOT NULL,
    "ruc" TEXT,
    "razonSocial" TEXT NOT NULL,
    "telefono" TEXT,
    "direccion" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'GENERAL',

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Compra" (
    "id" SERIAL NOT NULL,
    "correlativo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'COMPLETADA',
    "totalCompra" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "proveedorId" INTEGER NOT NULL,

    CONSTRAINT "Compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompraDetalle" (
    "id" SERIAL NOT NULL,
    "compraId" INTEGER NOT NULL,
    "tipoItem" TEXT NOT NULL,
    "insumoId" INTEGER,
    "productoId" INTEGER,
    "color" TEXT,
    "talla" TEXT,
    "skuProveedor" TEXT,
    "cantidad" INTEGER NOT NULL,
    "costoUnitario" DECIMAL(10,4) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "CompraDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CostoPromedioProducto_productoId_color_talla_key" ON "CostoPromedioProducto"("productoId", "color", "talla");

-- CreateIndex
CREATE UNIQUE INDEX "Proveedor_ruc_key" ON "Proveedor"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "Compra_correlativo_key" ON "Compra"("correlativo");

-- AddForeignKey
ALTER TABLE "CostoPromedioProducto" ADD CONSTRAINT "CostoPromedioProducto_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompraDetalle" ADD CONSTRAINT "CompraDetalle_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompraDetalle" ADD CONSTRAINT "CompraDetalle_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompraDetalle" ADD CONSTRAINT "CompraDetalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
