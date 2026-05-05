import { Injectable } from '@nestjs/common';
import { CreateTallereDto } from './dto/create-tallere.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TalleresService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTallereDto) {
    const taller = await this.prisma.proveedorTaller.create({
      data: {
        razonSocial: dto.razonSocial,
        tipo: dto.tipo, // Clasificamos si es Lavandería o Confección
        telefono: dto.telefono,
      },
    });

    return {
      mensaje: 'Taller o Proveedor registrado correctamente',
      taller: taller
    };
  }

  async findAll() {
    return this.prisma.proveedorTaller.findMany();
  }

  // FUNCIÓN PARA ACTUALIZAR (NUEVO)
  async update(id: number, data: any) {
    return this.prisma.proveedorTaller.update({
      where: { id },
      data: {
        razonSocial: data.razonSocial,
        tipo: data.tipo,
        telefono: data.telefono,
      },
    });
  }

  // FUNCIÓN PARA ELIMINAR (NUEVO)
  async remove(id: number) {
    return this.prisma.proveedorTaller.delete({
      where: { id },
    });
  }
}