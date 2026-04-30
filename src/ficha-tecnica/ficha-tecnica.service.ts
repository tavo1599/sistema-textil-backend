import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateFichaTecnicaDto } from './dto/create-ficha-tecnica.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FichaTecnicaService {
  constructor(private prisma: PrismaService) {}

  // 1. Agregar un ingrediente a la receta (Se queda igual, está perfecto)
  async create(dto: CreateFichaTecnicaDto) {
    const producto = await this.prisma.producto.findUnique({ where: { id: dto.productoId } });
    if (!producto) throw new NotFoundException('El producto no existe');

    const insumo = await this.prisma.insumo.findUnique({ where: { id: dto.insumoId } });
    if (!insumo) throw new NotFoundException('El insumo no existe');

    const nuevaFicha = await this.prisma.productoBom.create({
      data: {
        productoId: dto.productoId,
        insumoId: dto.insumoId,
        cantidadRequerida: dto.cantidadRequerida,
        mermaEstimadaPct: dto.mermaEstimadaPct || 0,
      },
      include: {
        insumo: true, 
      }
    });

    return {
      mensaje: 'Insumo agregado a la Ficha Técnica con éxito',
      detalle: nuevaFicha
    };
  }

  // 2. Ver la receta completa y el COSTO REAL (¡Aquí está la magia!)
  async findPorProducto(productoId: number) {
    const receta = await this.prisma.productoBom.findMany({
      where: { productoId: Number(productoId) }, // Aseguramos que sea número
      include: {
        insumo: true 
      }
    });

    // Empezamos la calculadora en 0
    let costoTotalFabricacion = 0;

    // Recorremos cada tela, hilo y botón para hacer el cálculo
    const ingredientesConCosto = receta.map(item => {
      
      // 1. Extraemos y forzamos a que sean Números (Esto quita la línea roja)
      const cantReq = Number(item.cantidadRequerida);
      const merma = Number(item.mermaEstimadaPct || 0); // Si viene null, usa 0
      const costoUni = Number(item.insumo.costoUnitario);

      // A) Calculamos cuánto se gasta realmente (Ej: 1.20 + 5% = 1.26)
      const cantidadRealConMerma = cantReq + (cantReq * (merma / 100));
      
      // B) Multiplicamos lo que gastamos por el costo unitario
      const subtotalCosto = cantidadRealConMerma * costoUni;
      
      // C) Lo sumamos al costo total del pantalón
      costoTotalFabricacion += subtotalCosto;

      return {
        insumo: item.insumo.nombre,
        unidad: item.insumo.unidadMedida,
        usoNeto: cantReq,
        merma: `${merma}%`,
        consumoRealAlmacen: cantidadRealConMerma, 
        costoUnitarioInsumo: costoUni,
        subtotalDinero: Number(subtotalCosto.toFixed(2)) 
      };
    });

    return {
      productoId,
      costoTotalFabricacion: Number(costoTotalFabricacion.toFixed(2)), // El precio final de tu pantalón
      ingredientes: ingredientesConCosto
    };
  }
}