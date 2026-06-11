-- AlterTable
ALTER TABLE "ConfigTienda" ADD COLUMN     "cuentaBanco" TEXT,
ADD COLUMN     "plin" TEXT,
ADD COLUMN     "titularCuenta" TEXT,
ADD COLUMN     "yape" TEXT;

-- AlterTable
ALTER TABLE "PedidoWeb" ADD COLUMN     "metodoPago" TEXT,
ADD COLUMN     "voucherUrl" TEXT;
