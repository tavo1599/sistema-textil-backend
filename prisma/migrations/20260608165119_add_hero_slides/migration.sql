-- CreateTable
CREATE TABLE "HeroSlide" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'imagen',
    "url" TEXT NOT NULL,
    "titulo" TEXT,
    "subtitulo" TEXT,
    "enlace" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "HeroSlide_pkey" PRIMARY KEY ("id")
);
