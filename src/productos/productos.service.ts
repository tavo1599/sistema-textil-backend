import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductosService {
  constructor(private prisma: PrismaService) {}

  // 1. CREAR MODELO BASE (El que te marcaba error)
  async create(data: any) {
    const existe = await this.prisma.producto.findUnique({ where: { skuBase: data.skuBase } });
    if (existe) throw new BadRequestException('El SKU ya existe');
    
    return this.prisma.producto.create({
      data: {
        skuBase: data.skuBase,
        nombre: data.nombre,
        categoria: data.categoria,
      }
    });
  }

  // 2. GUARDAR FICHA TÉCNICA (BOM + RUTA)
  async saveFichaTecnica(productoId: number, data: any) {
    return this.prisma.$transaction(async (tx) => {
      // Limpieza preventiva
      await tx.productoBom.deleteMany({ where: { productoId } });
      await tx.productoRuta.deleteMany({ where: { productoId } });

      // Guardar Materiales
      if (data.boms && data.boms.length > 0) {
        await tx.productoBom.createMany({
          data: data.boms.map((b: any) => ({
            productoId,
            insumoId: Number(b.insumoId),
            cantidadRequerida: Number(b.cantidadRequerida),
            mermaEstimadaPct: Number(b.mermaEstimadaPct || 0),
          })),
        });
      }

      // Guardar Ruta de Operaciones
      if (data.rutas && data.rutas.length > 0) {
        await tx.productoRuta.createMany({
          data: data.rutas.map((r: any, index: number) => ({
            productoId,
            tipoServicio: r.tipoServicio,
            ordenSecuencia: index + 1,
          })),
        });
      }
      return { message: 'Ficha guardada exitosamente' };
    });
  }

  async findAll() {
    return this.prisma.producto.findMany({ orderBy: { id: 'desc' } });
  }

  async findOne(id: number) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: {
        boms: { include: { insumo: true } },
        rutasBase: { orderBy: { ordenSecuencia: 'asc' } },
      },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    return producto;
  }
}