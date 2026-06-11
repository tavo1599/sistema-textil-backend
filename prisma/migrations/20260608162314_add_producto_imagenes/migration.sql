-- CreateTable
CREATE TABLE "ProductoImagen" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "color" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "productoId" INTEGER NOT NULL,

    CONSTRAINT "ProductoImagen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductoImagen_productoId_idx" ON "ProductoImagen"("productoId");

-- AddForeignKey
ALTER TABLE "ProductoImagen" ADD CONSTRAINT "ProductoImagen_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
