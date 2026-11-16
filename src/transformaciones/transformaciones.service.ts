import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KardexService } from '../kardex/kardex.service';

/**
 * TransformacionesService — DE ROLLOS DE TELA A PRENDAS
 * ===========================================================================
 * Esta es la bisagra del sistema. Convierte kilos de tela en prendas contables.
 *
 * EL RECORRIDO COMPLETO (todo queda registrado):
 *
 *   1) CREAR el corte  (estado EN_PROCESO)
 *      El cortador elige los rollos que se lleva y cuántos kilos de cada uno.
 *      Dice en qué prenda los convirtió: producto + matriz color × talla.
 *      → Se descuentan los kilos de cada rollo.
 *      → Las prendas AÚN NO existen en el almacén: están en el taller.
 *
 *   2) RECIBIR  (estado PARCIAL o RECIBIDO)
 *      El taller devuelve la producción terminada. Se cuenta lo que llegó
 *      de verdad (puede ser menos de lo cortado: fallas, mermas).
 *      → Esas prendas ingresan a InventarioTerminado en la bodega elegida.
 *      → Desde ahí ya se pueden VENDER o TRASLADAR normalmente.
 *      → Entran valorizadas: el costo de la tela se reparte entre las prendas.
 *
 *   3) ANULAR  (solo si todavía no se recibió nada)
 *      Los kilos vuelven a los rollos tal como estaban.
 *
 * El costo de cada prenda sale de la tela que consumió:
 *     costo por prenda = costo total de la tela usada / prendas recibidas
 * Así el kardex valorizado y los reportes de margen siguen cuadrando.
 */
@Injectable()
export class TransformacionesService {
  constructor(
    private prisma: PrismaService,
    private kardex: KardexService,
  ) {}

  // =========================================================================
  // CÓDIGO AUTOMÁTICO: TR-2026-0001
  // =========================================================================
  private async siguienteCodigo(tx: any): Promise<string> {
    const anio = new Date().getFullYear();
    const ultimo = await tx.transformacion.findFirst({
      where: { codigo: { startsWith: `TR-${anio}-` } },
      orderBy: { codigo: 'desc' },
      select: { codigo: true },
    });
    const ultimoNumero = ultimo ? Number(ultimo.codigo.split('-')[2]) || 0 : 0;
    return `TR-${anio}-${String(ultimoNumero + 1).padStart(4, '0')}`;
  }

  // =========================================================================
  // 1. CREAR EL CORTE
  // =========================================================================
  async crear(data: {
    productoId: number;
    rollos: { rolloId: number; pesoUsado: number }[];
    detalles: { color: string; talla: string; cantidad: number }[];
    cortador?: string;
    tallerId?: number | null;
    numeroGuia?: string;
    observacion?: string;
  }) {
    // ---- Validaciones de entrada (mensajes claros para el usuario) ----
    if (!data.productoId) {
      throw new BadRequestException('Elige en qué prenda se transformó la tela.');
    }

    const rollosPedidos = (data.rollos || [])
      .map((r) => ({ rolloId: Number(r.rolloId), pesoUsado: Number(r.pesoUsado) }))
      .filter((r) => r.rolloId && r.pesoUsado > 0);

    if (rollosPedidos.length === 0) {
      throw new BadRequestException('Selecciona al menos un rollo y cuántos kilos se usaron.');
    }

    const detalles = (data.detalles || [])
      .map((d) => ({
        color: String(d.color || '').trim(),
        talla: String(d.talla || '').trim().toUpperCase(),
        cantidad: Math.trunc(Number(d.cantidad) || 0),
      }))
      .filter((d) => d.color && d.talla && d.cantidad > 0);

    if (detalles.length === 0) {
      throw new BadRequestException(
        'Llena la tabla: cuántas prendas salieron por cada color y talla.',
      );
    }

    const totalPrendas = detalles.reduce((s, d) => s + d.cantidad, 0);

    return this.prisma.$transaction(async (tx) => {
      // ---- El producto debe existir ----
      const producto = await tx.producto.findUnique({ where: { id: Number(data.productoId) } });
      if (!producto) {
        throw new NotFoundException(`No existe la prenda #${data.productoId}.`);
      }

      // ---- Verificar y descontar los kilos de cada rollo ----
      let pesoTotalUsado = 0;
      let costoTelaTotal = 0;
      const lineasRollo: any[] = [];

      for (const pedido of rollosPedidos) {
        const rollo = await tx.rolloTela.findUnique({ where: { id: pedido.rolloId } });
        if (!rollo) {
          throw new NotFoundException(`No existe el rollo #${pedido.rolloId}.`);
        }
        if (rollo.estado === 'ANULADO') {
          throw new BadRequestException(`El rollo ${rollo.codigo} está anulado.`);
        }

        const disponible = Number(rollo.pesoActual);
        if (pedido.pesoUsado > disponible + 0.0001) {
          throw new BadRequestException(
            `El rollo ${rollo.codigo} (${rollo.color}) solo tiene ${disponible.toFixed(3)} kg ` +
              `y estás usando ${pedido.pesoUsado.toFixed(3)} kg.`,
          );
        }

        const pesoRestante = Number((disponible - pedido.pesoUsado).toFixed(3));
        const costoKilo = Number(rollo.costoPorKilo);

        await tx.rolloTela.update({
          where: { id: rollo.id },
          data: {
            pesoActual: pesoRestante,
            estado: pesoRestante <= 0 ? 'CONSUMIDO' : 'EN_USO',
          },
        });

        pesoTotalUsado += pedido.pesoUsado;
        costoTelaTotal += pedido.pesoUsado * costoKilo;

        lineasRollo.push({
          rolloId: rollo.id,
          pesoUsado: pedido.pesoUsado,
          costoPorKilo: costoKilo,
          pesoRestante,
          codigo: rollo.codigo,
        });
      }

      // ---- Crear la cabecera + las dos listas hijas ----
      const codigo = await this.siguienteCodigo(tx);

      const transformacion = await tx.transformacion.create({
        data: {
          codigo,
          estado: 'EN_PROCESO',
          productoId: Number(data.productoId),
          tallerId: data.tallerId ? Number(data.tallerId) : null,
          cortador: data.cortador?.trim() || null,
          numeroGuia: data.numeroGuia?.trim() || null,
          observacion: data.observacion?.trim() || null,
          pesoTotalUsado: Number(pesoTotalUsado.toFixed(3)),
          costoTelaTotal: Number(costoTelaTotal.toFixed(4)),
          prendasPlanificadas: totalPrendas,
          prendasRecibidas: 0,
          rollos: {
            create: lineasRollo.map((l) => ({
              rolloId: l.rolloId,
              pesoUsado: l.pesoUsado,
              costoPorKilo: l.costoPorKilo,
            })),
          },
          detalles: {
            create: detalles.map((d) => ({
              color: d.color,
              talla: d.talla,
              cantidad: d.cantidad,
              cantidadRecibida: 0,
            })),
          },
        },
        include: { detalles: true, rollos: true, producto: { select: { nombre: true } } },
      });

      // ---- Dejar el rastro de kilos en el historial de cada rollo ----
      for (const l of lineasRollo) {
        await tx.movimientoRollo.create({
          data: {
            rolloId: l.rolloId,
            tipo: 'CONSUMO',
            peso: -l.pesoUsado,
            pesoResultante: l.pesoRestante,
            motivo: `Corte ${codigo} — ${producto.nombre}`,
            referenciaId: transformacion.id,
          },
        });
      }

      return transformacion;
    });
  }

  // =========================================================================
  // 2. RECIBIR LA PRODUCCIÓN TERMINADA → ENTRA A ALMACÉN DE TERMINADOS
  // =========================================================================
  async recibir(
    id: number,
    data: {
      bodegaDestinoId: number;
      recibidos: { color: string; talla: string; cantidad: number }[];
    },
  ) {
    if (!data.bodegaDestinoId) {
      throw new BadRequestException('Elige a qué bodega entra la producción terminada.');
    }

    const recibidos = (data.recibidos || [])
      .map((r) => ({
        color: String(r.color || '').trim(),
        talla: String(r.talla || '').trim().toUpperCase(),
        cantidad: Math.trunc(Number(r.cantidad) || 0),
      }))
      .filter((r) => r.color && r.talla && r.cantidad > 0);

    if (recibidos.length === 0) {
      throw new BadRequestException('Indica cuántas prendas llegaron del taller.');
    }

    return this.prisma.$transaction(async (tx) => {
      const transformacion = await tx.transformacion.findUnique({
        where: { id },
        include: { detalles: true, producto: true },
      });
      if (!transformacion) throw new NotFoundException(`No existe la transformación #${id}.`);
      if (transformacion.estado === 'ANULADO') {
        throw new BadRequestException('Esta transformación está anulada.');
      }

      const bodega = await tx.bodega.findUnique({ where: { id: Number(data.bodegaDestinoId) } });
      if (!bodega) throw new NotFoundException('La bodega de destino no existe.');

      // ---- Costo unitario: la tela se reparte entre las prendas que llegaron ----
      // Si ya se recibió una parte antes, repartimos sobre el total recibido
      // acumulado para que el promedio no se distorsione.
      const totalRecibidoAhora = recibidos.reduce((s, r) => s + r.cantidad, 0);
      const totalRecibidoAcumulado = transformacion.prendasRecibidas + totalRecibidoAhora;
      const costoUnitario =
        totalRecibidoAcumulado > 0
          ? Number(transformacion.costoTelaTotal) / totalRecibidoAcumulado
          : 0;

      // ---- Cada línea recibida sube al inventario y al kardex valorizado ----
      for (const r of recibidos) {
        const detalle = transformacion.detalles.find(
          (d) => d.color === r.color && d.talla === r.talla,
        );

        if (detalle) {
          const pendiente = detalle.cantidad - detalle.cantidadRecibida;
          if (r.cantidad > pendiente) {
            throw new BadRequestException(
              `${transformacion.producto.nombre} ${r.color}/${r.talla}: se cortaron ` +
                `${detalle.cantidad} y ya se recibieron ${detalle.cantidadRecibida}. ` +
                `No puedes recibir ${r.cantidad} más (quedan ${pendiente}).`,
            );
          }
          await tx.transformacionDetalle.update({
            where: { id: detalle.id },
            data: { cantidadRecibida: { increment: r.cantidad } },
          });
        } else {
          // Llegó una combinación que no estaba en el corte. La aceptamos pero
          // la dejamos anotada, porque el almacén físico siempre manda.
          await tx.transformacionDetalle.create({
            data: {
              transformacionId: id,
              color: r.color,
              talla: r.talla,
              cantidad: 0,
              cantidadRecibida: r.cantidad,
            },
          });
        }

        // 🔥 Aquí la prenda nace para el negocio: entra al stock y queda vendible.
        await this.kardex.registrarIngreso(tx, {
          productoId: transformacion.productoId,
          color: r.color,
          talla: r.talla,
          bodegaId: Number(data.bodegaDestinoId),
          cantidad: r.cantidad,
          costoUnitario: Number(costoUnitario.toFixed(4)),
          motivo: `PRODUCCIÓN ${transformacion.codigo}`,
          tipoMovimiento: 'INGRESO',
          referenciaId: transformacion.id,
          actualizarStockFisico: true,
        });
      }

      // ---- ¿Quedó completo o parcial? ----
      const detallesFinales = await tx.transformacionDetalle.findMany({
        where: { transformacionId: id },
      });
      const cortadas = detallesFinales.reduce((s, d) => s + d.cantidad, 0);
      const llegadas = detallesFinales.reduce((s, d) => s + d.cantidadRecibida, 0);

      return tx.transformacion.update({
        where: { id },
        data: {
          prendasRecibidas: llegadas,
          bodegaDestinoId: Number(data.bodegaDestinoId),
          estado: llegadas >= cortadas ? 'RECIBIDO' : 'PARCIAL',
        },
        include: { detalles: true, producto: { select: { nombre: true } } },
      });
    });
  }

  // =========================================================================
  // 3. ANULAR: la tela vuelve a los rollos
  // =========================================================================
  async anular(id: number, motivo?: string) {
    return this.prisma.$transaction(async (tx) => {
      const transformacion = await tx.transformacion.findUnique({
        where: { id },
        include: { rollos: { include: { rollo: true } } },
      });
      if (!transformacion) throw new NotFoundException(`No existe la transformación #${id}.`);
      if (transformacion.estado === 'ANULADO') {
        throw new BadRequestException('Esta transformación ya estaba anulada.');
      }
      if (transformacion.prendasRecibidas > 0) {
        throw new BadRequestException(
          `No se puede anular: ya ingresaron ${transformacion.prendasRecibidas} prendas al almacén. ` +
            'Corrige el stock desde Almacén de Terminados.',
        );
      }

      // Devolvemos los kilos exactos que se habían descontado
      for (const linea of transformacion.rollos) {
        const pesoDevuelto = Number(linea.pesoUsado);
        const nuevoPeso = Number((Number(linea.rollo.pesoActual) + pesoDevuelto).toFixed(3));

        await tx.rolloTela.update({
          where: { id: linea.rolloId },
          data: {
            pesoActual: nuevoPeso,
            estado: nuevoPeso > 0 ? 'EN_USO' : 'CONSUMIDO',
          },
        });

        await tx.movimientoRollo.create({
          data: {
            rolloId: linea.rolloId,
            tipo: 'DEVOLUCION',
            peso: pesoDevuelto,
            pesoResultante: nuevoPeso,
            motivo: `Anulación del corte ${transformacion.codigo}`,
            referenciaId: transformacion.id,
          },
        });
      }

      return tx.transformacion.update({
        where: { id },
        data: {
          estado: 'ANULADO',
          observacion: [transformacion.observacion, `ANULADA: ${motivo || 'sin motivo'}`]
            .filter(Boolean)
            .join(' | '),
        },
      });
    });
  }

  // =========================================================================
  // LISTADO / HISTORIAL
  // =========================================================================
  async listar(filtros: { estado?: string; desde?: string; hasta?: string; productoId?: number } = {}) {
    const where: any = {};
    if (filtros.estado) where.estado = filtros.estado;
    if (filtros.productoId) where.productoId = Number(filtros.productoId);
    if (filtros.desde || filtros.hasta) {
      where.fecha = {};
      if (filtros.desde) where.fecha.gte = new Date(`${filtros.desde}T00:00:00`);
      if (filtros.hasta) where.fecha.lte = new Date(`${filtros.hasta}T23:59:59`);
    }

    return this.prisma.transformacion.findMany({
      where,
      include: {
        producto: { select: { id: true, nombre: true, skuBase: true } },
        taller: { select: { id: true, razonSocial: true } },
        detalles: true,
        rollos: { include: { rollo: { select: { codigo: true, color: true } } } },
      },
      orderBy: { fecha: 'desc' },
      take: 300,
    });
  }

  async detalle(id: number) {
    const t = await this.prisma.transformacion.findUnique({
      where: { id },
      include: {
        producto: true,
        taller: { select: { id: true, razonSocial: true } },
        detalles: { orderBy: [{ color: 'asc' }, { talla: 'asc' }] },
        rollos: { include: { rollo: true } },
      },
    });
    if (!t) throw new NotFoundException(`No existe la transformación #${id}.`);
    return t;
  }

  // =========================================================================
  // REPORTE DE PRODUCCIÓN: cuánta tela entró y cuántas prendas salieron
  // =========================================================================
  async reporte(filtros: { desde?: string; hasta?: string; productoId?: number } = {}) {
    const where: any = { estado: { not: 'ANULADO' } };
    if (filtros.productoId) where.productoId = Number(filtros.productoId);
    if (filtros.desde || filtros.hasta) {
      where.fecha = {};
      if (filtros.desde) where.fecha.gte = new Date(`${filtros.desde}T00:00:00`);
      if (filtros.hasta) where.fecha.lte = new Date(`${filtros.hasta}T23:59:59`);
    }

    const transformaciones = await this.prisma.transformacion.findMany({
      where,
      include: {
        producto: { select: { id: true, nombre: true } },
        detalles: true,
        rollos: { include: { rollo: { select: { color: true } } } },
      },
      orderBy: { fecha: 'desc' },
    });

    let kilosUsados = 0;
    let prendasCortadas = 0;
    let prendasRecibidas = 0;
    let costoTela = 0;

    // Agrupaciones útiles para la pantalla
    const porProducto: Record<string, any> = {};
    const porTalla: Record<string, number> = {};
    const porColor: Record<string, number> = {};
    // Matriz color × talla: es como la gente mira la ropa (las tallas arriba,
    // los colores a la izquierda). Guardamos lo cortado y lo recibido de cada
    // casilla para que la pantalla pueda mostrar cualquiera de los dos.
    const celdas: Record<string, { color: string; talla: string; cortadas: number; recibidas: number }> = {};

    for (const t of transformaciones) {
      kilosUsados += Number(t.pesoTotalUsado);
      prendasCortadas += t.prendasPlanificadas;
      prendasRecibidas += t.prendasRecibidas;
      costoTela += Number(t.costoTelaTotal);

      const clave = t.producto.nombre;
      if (!porProducto[clave]) {
        porProducto[clave] = {
          productoId: t.producto.id,
          producto: clave,
          cortes: 0,
          kilos: 0,
          cortadas: 0,
          recibidas: 0,
        };
      }
      porProducto[clave].cortes += 1;
      porProducto[clave].kilos += Number(t.pesoTotalUsado);
      porProducto[clave].cortadas += t.prendasPlanificadas;
      porProducto[clave].recibidas += t.prendasRecibidas;

      for (const d of t.detalles) {
        porTalla[d.talla] = (porTalla[d.talla] || 0) + d.cantidad;
        porColor[d.color] = (porColor[d.color] || 0) + d.cantidad;

        const casilla = `${d.color}|${d.talla}`;
        if (!celdas[casilla]) {
          celdas[casilla] = { color: d.color, talla: d.talla, cortadas: 0, recibidas: 0 };
        }
        celdas[casilla].cortadas += d.cantidad;
        celdas[casilla].recibidas += d.cantidadRecibida;
      }
    }

    // Rendimiento: cuántas prendas sale por kilo de tela. Es el número que
    // dice si el cortador está aprovechando bien la tela.
    const rendimiento = kilosUsados > 0 ? prendasRecibidas / kilosUsados : 0;

    return {
      totales: {
        cortes: transformaciones.length,
        kilosUsados: Number(kilosUsados.toFixed(3)),
        prendasCortadas,
        prendasRecibidas,
        prendasPendientes: prendasCortadas - prendasRecibidas,
        costoTela: Number(costoTela.toFixed(2)),
        rendimientoPrendasPorKilo: Number(rendimiento.toFixed(2)),
        costoTelaPorPrenda:
          prendasRecibidas > 0 ? Number((costoTela / prendasRecibidas).toFixed(2)) : 0,
      },
      porProducto: Object.values(porProducto).map((p: any) => ({
        ...p,
        kilos: Number(p.kilos.toFixed(3)),
        rendimiento: p.kilos > 0 ? Number((p.recibidas / p.kilos).toFixed(2)) : 0,
      })),
      // La matriz va cruda: la pantalla ordena las tallas con su propio orden
      // natural (S, M, L, XL... no alfabético).
      matriz: {
        colores: [...new Set(Object.values(celdas).map((c) => c.color))],
        tallas: [...new Set(Object.values(celdas).map((c) => c.talla))],
        celdas: Object.values(celdas),
      },
      porTalla: Object.entries(porTalla)
        .map(([talla, cantidad]) => ({ talla, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad),
      porColor: Object.entries(porColor)
        .map(([color, cantidad]) => ({ color, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad),
      cortes: transformaciones.map((t) => ({
        id: t.id,
        codigo: t.codigo,
        fecha: t.fecha,
        estado: t.estado,
        producto: t.producto.nombre,
        kilos: Number(t.pesoTotalUsado),
        cortadas: t.prendasPlanificadas,
        recibidas: t.prendasRecibidas,
        cortador: t.cortador,
      })),
    };
  }
}
