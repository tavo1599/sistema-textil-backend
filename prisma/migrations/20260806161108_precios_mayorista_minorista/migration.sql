-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "precioMayorista" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "precioMinorista" DECIMAL(10,2) NOT NULL DEFAULT 0.00;
