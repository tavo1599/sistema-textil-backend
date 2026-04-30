import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdenesService {
  constructor(private prisma: PrismaService) {}

  // ====================================================================
  // 1. CREAR ORDEN, DESCONTAR INVENTARIO Y COSTEAR
  // ====================================================================
  async create(dto: any) { 
    return this.prisma.$transaction(async (tx) => {
      
      const orden = await tx.ordenProduccion.create({
        data: {
          codigoOp: dto.codigoOp,
          productoId: dto.productoId,
          estado: 'En Proceso',
          rutas: {
            create: dto.servicios.map(s => ({
              tipoServicio: s.tipo,
              tallerId: s.tallerId,
              costoUnitarioPactado: s.costoPactado,
              ordenSecuencia: 1
            }))
          },
          gastosCif: {
            create: dto.cif.map(c => ({
              concepto: c.concepto,
              costoTotal: c.costoTotal
            }))
          }
        },
      });

      let totalPrendasAFabricar = 0;
      const detallesPromesas = Object.entries(dto.matriz).map(([key, cant]) => {
        const [colorNombre, tallaNombre] = key.split('-');
        totalPrendasAFabricar += Number(cant);
        
        return tx.ordenDetalleMatriz.create({
          data: {
            ordenId: orden.id,
            colorId: 1, // Recuerda luego mapear el ID real del color
            tallaId: 1, // Recuerda luego mapear el ID real de la talla
            cantidadProgramada: Number(cant),
          },
        });
      });
      await Promise.all(detallesPromesas);

      const receta = await tx.productoBom.findMany({
        where: { productoId: dto.productoId },
        include: { insumo: true }
      });

      if (receta.length === 0) throw new BadRequestException('El producto no tiene Ficha Técnica (BOM).');

      let costoTotalInsumosPorPrenda = 0;

      for (const item of receta) {
        const cantReq = Number(item.cantidadRequerida);
        const merma = Number(item.mermaEstimadaPct || 0);
        const consumoPorPrenda = cantReq * (1 + (merma / 100));
        
        costoTotalInsumosPorPrenda += (consumoPorPrenda * Number(item.insumo.costoUnitario));

        const totalADescontar = consumoPorPrenda * totalPrendasAFabricar;
        const stockActual = Number(item.insumo.stockActual);

        if (stockActual < totalADescontar) {
          throw new BadRequestException(`Falta stock de ${item.insumo.nombre}. Necesitas ${totalADescontar.toFixed(2)} pero hay ${stockActual}.`);
        }

        await tx.insumo.update({
          where: { id: item.insumoId },
          data: { stockActual: stockActual - totalADescontar }
        });
      }

      const costoServiciosUnitario = dto.servicios.reduce((sum, s) => sum + Number(s.costoPactado), 0);
      const totalGastoCif = dto.cif.reduce((sum, c) => sum + Number(c.costoTotal), 0);
      const cifUnitario = totalGastoCif / totalPrendasAFabricar;

      const costoFinalNetoUnitario = costoTotalInsumosPorPrenda + costoServiciosUnitario + cifUnitario;

      // --- AQUÍ EMPIEZA LA LÓGICA COMERCIAL (MODIFICADA) ---
      const igvFactor = 1.18; // 18% de IGV
      const precioMayoristaNeto = costoFinalNetoUnitario * 1.35;
      const precioMinoristaNeto = costoFinalNetoUnitario * 1.70;

      await tx.ordenCosteoFinal.create({
        data: {
          ordenId: orden.id,
          loteProducidoReal: totalPrendasAFabricar,
          costoTotalUnitarioNeto: costoFinalNetoUnitario,
          precioMayorista: precioMayoristaNeto,
          precioMinorista: precioMinoristaNeto,
        }
      });

      return {
        mensaje: 'Orden procesada con éxito',
        ordenId: orden.id,
        codigo: orden.codigoOp,
        costoUnitario: costoFinalNetoUnitario,
        totalInversion: costoFinalNetoUnitario * totalPrendasAFabricar,
        // ENVIAMOS EL PAQUETE COMERCIAL AL FRONTEND
        comercial: {
          mayoristaNeto: precioMayoristaNeto,
          mayoristaConIgv: precioMayoristaNeto * igvFactor,
          minoristaNeto: precioMinoristaNeto,
          minoristaConIgv: precioMinoristaNeto * igvFactor,
          igvMontoMayorista: precioMayoristaNeto * 0.18
        }
      };
      // --- FIN DE LA LÓGICA COMERCIAL ---
    });
  }

  // ====================================================================
  // 2. LISTAR TODAS LAS ÓRDENES
  // ====================================================================
  async findAll() {
    return this.prisma.ordenProduccion.findMany({
      include: {
        producto: true,
        costeoFinal: true
      },
      orderBy: {
        fechaInicio: 'desc'
      }
    });
  }

  // ====================================================================
  // 3. BUSCAR UNA ORDEN ESPECÍFICA
  // ====================================================================
  async findOne(id: number) {
    return this.prisma.ordenProduccion.findUnique({
      where: { id: id },
      include: {
        producto: true,
        detallesMatriz: true,
        rutas: {
          include: { taller: true }
        },
        gastosCif: true,
        costeoFinal: true
      }
    });
  }
}