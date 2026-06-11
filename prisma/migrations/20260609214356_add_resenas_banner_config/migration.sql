-- CreateTable
CREATE TABLE "Resena" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "estrellas" INTEGER NOT NULL DEFAULT 5,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Resena_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BannerPromo" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "titulo" TEXT,
    "subtitulo" TEXT,
    "textoBoton" TEXT,
    "enlace" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BannerPromo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigTienda" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "whatsapp" TEXT,
    "instagram" TEXT,
    "facebook" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "horario" TEXT,

    CONSTRAINT "ConfigTienda_pkey" PRIMARY KEY ("id")
);
