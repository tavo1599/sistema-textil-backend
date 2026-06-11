-- CreateTable
CREATE TABLE "Reclamacion" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nombre" TEXT NOT NULL,
    "documento" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "menorEdad" BOOLEAN NOT NULL DEFAULT false,
    "tipoBien" TEXT,
    "montoReclamado" TEXT,
    "descripcionBien" TEXT,
    "pedidoCodigo" TEXT,
    "tipo" TEXT NOT NULL,
    "detalle" TEXT NOT NULL,
    "pedidoConsumidor" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "respuesta" TEXT,

    CONSTRAINT "Reclamacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reclamacion_codigo_key" ON "Reclamacion"("codigo");
