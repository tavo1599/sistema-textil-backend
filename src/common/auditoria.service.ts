import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditoriaService {
  constructor(private prisma: PrismaService) {}

  async registrar(usuarioId: number, accion: string, tabla: string, registroId: number, detalles?: string) {
    return this.prisma.auditoria.create({
      data: {
        usuarioId,
        accion,
        tabla,
        registroId,
        detalles,
      },
    });
  }
}