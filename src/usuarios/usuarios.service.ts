import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

// Roles válidos del sistema. Si más adelante agregas otro (ej. 'ALMACENERO'),
// solo se añade aquí y en el front.
export const ROLES_VALIDOS = ['ADMIN', 'VENDEDOR'];

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  // Listar todos (nunca devolvemos el password)
  async findAll() {
    const usuarios = await this.prisma.usuario.findMany({
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        bodegas: { select: { bodegaId: true } },
      },
      orderBy: { id: 'asc' },
    });
    // Aplanamos a una lista de ids, que es lo que la pantalla usa.
    return usuarios.map((u) => ({
      id: u.id,
      email: u.email,
      nombre: u.nombre,
      rol: u.rol,
      bodegaIds: u.bodegas.map((b) => b.bodegaId),
    }));
  }

  // Reemplaza el conjunto de bodegas de un usuario por el que llega (idempotente).
  private async fijarBodegas(usuarioId: number, bodegaIds: any) {
    if (!Array.isArray(bodegaIds)) return; // undefined = no tocar
    const ids = [...new Set(bodegaIds.map((x: any) => Number(x)).filter((x: number) => x > 0))];
    await this.prisma.usuarioBodega.deleteMany({ where: { usuarioId } });
    if (ids.length > 0) {
      await this.prisma.usuarioBodega.createMany({
        data: ids.map((bodegaId) => ({ usuarioId, bodegaId })),
        skipDuplicates: true,
      });
    }
  }

  // Crear usuario con contraseña hasheada
  async create(data: any) {
    if (!data.email || !data.password || !data.nombre) {
      throw new BadRequestException('Email, nombre y contraseña son obligatorios.');
    }
    const rol = (data.rol || 'VENDEDOR').toUpperCase();
    if (!ROLES_VALIDOS.includes(rol)) {
      throw new BadRequestException(`Rol inválido. Usa uno de: ${ROLES_VALIDOS.join(', ')}`);
    }

    const existe = await this.prisma.usuario.findUnique({ where: { email: data.email } });
    if (existe) throw new BadRequestException(`El email ${data.email} ya está registrado.`);

    const passwordHashed = await bcrypt.hash(data.password, 10);
    const usuario = await this.prisma.usuario.create({
      data: { email: data.email, nombre: data.nombre, password: passwordHashed, rol },
    });

    await this.fijarBodegas(usuario.id, data.bodegaIds);

    return { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol };
  }

  // Actualizar (nombre, rol, y opcionalmente contraseña)
  async update(id: number, data: any) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    const dataUpdate: any = {};
    if (data.nombre) dataUpdate.nombre = data.nombre;
    if (data.rol) {
      const rol = String(data.rol).toUpperCase();
      if (!ROLES_VALIDOS.includes(rol)) {
        throw new BadRequestException(`Rol inválido. Usa uno de: ${ROLES_VALIDOS.join(', ')}`);
      }
      dataUpdate.rol = rol;
    }
    // Solo cambiamos la contraseña si mandan una nueva (no vacía)
    if (data.password && String(data.password).trim() !== '') {
      dataUpdate.password = await bcrypt.hash(data.password, 10);
    }

    const actualizado = await this.prisma.usuario.update({ where: { id }, data: dataUpdate });

    await this.fijarBodegas(id, data.bodegaIds);

    return { id: actualizado.id, email: actualizado.email, nombre: actualizado.nombre, rol: actualizado.rol };
  }

  // Eliminar (con protección: no dejar el sistema sin ADMIN)
  async remove(id: number) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    if (usuario.rol === 'ADMIN') {
      const totalAdmins = await this.prisma.usuario.count({ where: { rol: 'ADMIN' } });
      if (totalAdmins <= 1) {
        throw new BadRequestException('No puedes eliminar al único ADMIN del sistema.');
      }
    }

    try {
      await this.prisma.usuario.delete({ where: { id } });
      return { mensaje: 'Usuario eliminado correctamente.' };
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'No se puede eliminar: este usuario tiene registros de auditoría asociados. Considera cambiar su rol en lugar de borrarlo.',
        );
      }
      throw error;
    }
  }
}
