-- CreateTable
CREATE TABLE "PedidoWeb" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "clienteNombre" TEXT NOT NULL,
    "documento" TEXT,
    "telefono" TEXT NOT NULL,
    "email" TEXT,
    "direccion" TEXT,
    "metodoEntrega" TEXT NOT NULL DEFAULT 'ENVIO',
    "notas" TEXT,
    "total" DECIMAL(10,2) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PedidoWeb_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoWebDetalle" (
    "id" SERIAL NOT NULL,
    "pedidoId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "talla" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "PedidoWebDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PedidoWeb_codigo_key" ON "PedidoWeb"("codigo");

-- AddForeignKey
ALTER TABLE "PedidoWebDetalle" ADD CONSTRAINT "PedidoWebDetalle_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoWeb"("id") ON DELETE CASCADE ON UPDATE CASCADE;
