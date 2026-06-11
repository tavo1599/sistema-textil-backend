-- AlterTable
ALTER TABLE "PedidoWeb" ADD COLUMN     "cuponCodigo" TEXT,
ADD COLUMN     "descuento" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- CreateTable
CREATE TABLE "CuponDescuento" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'PORCENTAJE',
    "valor" DECIMAL(10,2) NOT NULL,
    "minCompra" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "maxUsos" INTEGER,
    "usos" INTEGER NOT NULL DEFAULT 0,
    "vence" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CuponDescuento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CuponDescuento_codigo_key" ON "CuponDescuento"("codigo");
