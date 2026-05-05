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
      
      // 1. Crear la cabecera de la OP y sus rutas/gastos
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

      // 2. Filtrar la matriz (solo guardar las tallas mayores a 0)
      const matrizValida = Object.entries(dto.matriz).filter(([_, cant]) => Number(cant) > 0);
      let totalPrendasAFabricar = 0;

      // 3. Preparar la data para guardar masivamente (Más rápido)
const detallesData: any[] = matrizValida.map(([key, cant]) => { // <-- Agregamos : any[] aquí
        const [colorNombre, tallaNombre] = key.split('-');
        totalPrendasAFabricar += Number(cant);
        
        return {
          ordenId: orden.id,
          color: colorNombre,  // String
          talla: tallaNombre,  // String
          cantidadProgramada: Number(cant),
        };
      });

      // Guardar todo de golpe
      await tx.ordenDetalleMatriz.createMany({ data: detallesData });

      // 4. Extraer Ficha Técnica y descontar stock
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

      // 5. Cálculos Financieros
      const costoServiciosUnitario = dto.servicios.reduce((sum, s) => sum + Number(s.costoPactado), 0);
      const totalGastoCif = dto.cif.reduce((sum, c) => sum + Number(c.costoTotal), 0);
      const cifUnitario = totalGastoCif / totalPrendasAFabricar;

      const costoFinalNetoUnitario = costoTotalInsumosPorPrenda + costoServiciosUnitario + cifUnitario;

      // Lógica Comercial
      const igvFactor = 1.18; 
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
        comercial: {
          mayoristaNeto: precioMayoristaNeto,
          mayoristaConIgv: precioMayoristaNeto * igvFactor,
          minoristaNeto: precioMinoristaNeto,
          minoristaConIgv: precioMinoristaNeto * igvFactor,
          igvMontoMayorista: precioMayoristaNeto * 0.18
        }
      };
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

  // ====================================================================
  // 4. ACTUALIZAR ESTADO (MAGIA LOGÍSTICA DE ERP)
  // ====================================================================
  async actualizarEstado(id: number, estado: string) {
    return this.prisma.$transaction(async (tx) => {
      const orden = await tx.ordenProduccion.findUnique({
        where: { id },
        include: { detallesMatriz: true }
      });

      if (!orden) throw new BadRequestException('Orden no encontrada');
      if (orden.estado === estado) return orden; 

      // 🔴 CASO 1: ANULAR ORDEN -> DEVOLVER INSUMOS A ALMACÉN
      if (orden.estado === 'En Proceso' && estado === 'Anulada') {
        const totalPrendas = orden.detallesMatriz.reduce((sum, d) => sum + Number(d.cantidadProgramada), 0);
        
        const receta = await tx.productoBom.findMany({
          where: { productoId: orden.productoId }
        });

        for (const item of receta) {
          const consumoPorPrenda = Number(item.cantidadRequerida) * (1 + (Number(item.mermaEstimadaPct || 0) / 100));
          const totalDevolver = consumoPorPrenda * totalPrendas;

          await tx.insumo.update({
            where: { id: item.insumoId },
            data: { stockActual: { increment: totalDevolver } }
          });
        }
      }

      // 🟢 CASO 2: TERMINAR ORDEN -> INGRESAR PRODUCTOS TERMINADOS
      if (orden.estado === 'En Proceso' && estado === 'Terminada') {
        
        // Buscamos la primera bodega activa que exista en tu sistema
        const bodegaPrincipal = await tx.bodega.findFirst({
          where: { estado: true }
        });

        if (!bodegaPrincipal) {
          throw new BadRequestException('No se encontró ninguna Bodega activa para guardar los productos. Crea una bodega primero.');
        }

        for (const detalle of orden.detallesMatriz) {
          await tx.inventarioTerminado.upsert({
            where: { 
              productoId_bodegaId_color_talla: {
                productoId: orden.productoId,
                bodegaId: bodegaPrincipal.id, // <-- ¡Ahora es dinámico!
                color: (detalle as any).color, 
                talla: (detalle as any).talla  
              }
            },
            update: {
              stock: { increment: Number(detalle.cantidadProgramada) }
            },
            create: {
              productoId: orden.productoId,
              bodegaId: bodegaPrincipal.id, // <-- ¡Ahora es dinámico!
              color: (detalle as any).color,
              talla: (detalle as any).talla,
              stock: Number(detalle.cantidadProgramada)
            }
          });
        }
      }

      // Actualizamos el estado visual en la DB
      return tx.ordenProduccion.update({
        where: { id },
        data: { estado }
      });
    });
  }
}