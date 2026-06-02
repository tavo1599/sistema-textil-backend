-- CreateTable
CREATE TABLE "MovimientoInsumo" (
    "id" SERIAL NOT NULL,
    "tipoMovimiento" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "cantidad" DECIMAL(12,4) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenciaId" INTEGER,
    "insumoId" INTEGER NOT NULL,
    "costoUnitario" DECIMAL(12,4) NOT NULL,
    "costoTotal" DECIMAL(14,4) NOT NULL,
    "saldoResultante" DECIMAL(12,4) NOT NULL,

    CONSTRAINT "MovimientoInsumo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MovimientoInsumo" ADD CONSTRAINT "MovimientoInsumo_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
