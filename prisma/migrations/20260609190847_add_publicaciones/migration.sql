-- CreateTable
CREATE TABLE "Publicacion" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'imagen',
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "enlace" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Publicacion_pkey" PRIMARY KEY ("id")
);
