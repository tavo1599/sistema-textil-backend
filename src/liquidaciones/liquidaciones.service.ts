import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLiquidationDto } from './dto/create-liquidacione.dto'; // Verifica que el nombre del archivo coincida

@Injectable()
export class LiquidacionesService {
  constructor(private prisma: PrismaService) {}

  async calcularCostoReal(dto: CreateLiquidationDto) {
    // 1. Buscamos la orden usando los nombres exactos de tu esquema: 'boms' y 'detallesMatriz'
    const orden = await this.prisma.ordenProduccion.findUnique({
      where: { id: dto.ordenId },
      include: { 
        producto: { 
          include: { 
            boms: { // En tu schema es 'boms'
              include: { insumo: true } 
            } 
          } 
        },
        detallesMatriz: true // En tu schema es 'detallesMatriz'
      }
    });

    if (!orden) throw new NotFoundException(`No se encontró la Orden con ID ${dto.ordenId}`);

    // 2. Sumamos la matriz de producción (cantidades programadas)
    const totalPrendas = orden.detallesMatriz.reduce((sum, item) => sum + item.cantidadProgramada, 0);

    if (totalPrendas === 0) return { mensaje: "La orden no tiene prendas programadas" };

    // 3. Calculamos costo de Materia Prima usando 'boms'
    let costoMateriaPrimaUnitario = 0;
    
    // Usamos Number() porque tus campos son Decimal en Postgres
    orden.producto.boms.forEach(item => {
      const cantidad = Number(item.cantidadRequerida);
      const merma = 1 + (Number(item.mermaEstimadaPct) / 100);
      const precioInsumo = Number(item.insumo.costoUnitario);
      
      costoMateriaPrimaUnitario += (cantidad * merma * precioInsumo);
    });

    // 4. Sumamos costos de servicio y adicionales
    const costoServicioUnitario = Number(dto.costoServicioUnitario);
    const adicionales = Number(dto.otrosCostosAdicionales || 0) / totalPrendas;

    const costoFinalUnitario = costoMateriaPrimaUnitario + costoServicioUnitario + adicionales;

    return {
      orden: orden.codigoOp,
      producto: orden.producto.nombre,
      analisisCosto: {
        totalUnidades: totalPrendas,
        materiaPrimaUnitario: costoMateriaPrimaUnitario.toFixed(2),
        servicioTallerUnitario: costoServicioUnitario.toFixed(2),
        gastosAdicionalesUnitario: adicionales.toFixed(2),
        COSTO_TOTAL_UNITARIO: costoFinalUnitario.toFixed(2)
      },
      inversionTotalLote: (costoFinalUnitario * totalPrendas).toFixed(2)
    };
  }
}