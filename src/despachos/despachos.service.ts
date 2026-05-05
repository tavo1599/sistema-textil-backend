import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DespachosService {
  constructor(private prisma: PrismaService) {}

  // Busca los despachos pendientes en la Base de Datos real
  async obtenerPendientes() {
    const despachos = await this.prisma.despachoVenta.findMany({
      where: {
        estado: {
          not: 'Entregado' // Traemos todo lo que no se haya entregado aún
        }
      },
      orderBy: {
        fecha: 'desc'
      }
    });

    // Formateamos los datos para que el Frontend de Vue los lea perfecto
    return despachos.map(d => ({
      id: d.id,                 // ID real numérico (Ej: 1)
      codigoGuia: d.codigoGuia, // Código de remisión (Ej: GR-2026-1234)
      cliente: d.cliente,
      destino: d.destino,
      prendas: d.prendas,
      estado: d.estado,
      fecha: d.fecha.toISOString() // Mandamos fecha estándar para que el frontend no se confunda
    }));
  }

  // Función para crear un despacho de prueba rápido
  async crearPrueba() {
    return this.prisma.despachoVenta.create({
      data: {
        codigoGuia: `GR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        cliente: 'Boutique Las Palmeras S.A.C.',
        destino: 'Agencia Shalom - Av. Argentina 123',
        prendas: 45,
        estado: 'Listo para Empaque'
      }
    });
  }

  // Actualizar el estado de un despacho
  async actualizarEstado(id: number, nuevoEstado: string) {
    return this.prisma.despachoVenta.update({
      where: { id },
      data: { estado: nuevoEstado }
    });
  }
}