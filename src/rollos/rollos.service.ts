import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ESTADOS_TRANSFORMACION_PENDIENTE,
  recalcularCierreRollos,
} from './cierre-rollos';

/**
 * RollosService — ALMACÉN DE TELA EN ROLLOS
 * ---------------------------------------------------------------------------
 * Cada rollo físico es UNA fila. Si llegan 20 rollos, se registran 20 filas.
 * Eso es lo que permite que el cortador después elija exactamente los rollos
 * que se lleva, viendo el peso y el color de cada uno.
 *
 * El peso es la unidad de verdad:
 *   pesoInicial -> con cuántos kilos entró el rollo
 *   pesoActual  -> cuántos kilos quedan hoy
 *
 * Cada cambio de peso deja una fila en MovimientoRollo, así nunca hay que
 * adivinar por qué un rollo que entró con 25 kg hoy tiene 3 kg.
 */
/**
 * ORDEN EN QUE SE LEE EL ALMACÉN.
 * Primero lo que se puede usar, al final lo que ya no. Dentro de cada grupo,
 * por color (así los rollos del mismo color salen juntos) y luego por código.
 */
const PESO_DE_GRUPO: Record<string, number> = {
  CON_KILOS: 0,
  EN_TRANSFORMACION: 1,
  SIN_KILOS: 2,
  CERRADO: 3,
  ANULADO: 4,
};

function ordenDeAlmacen(a: any, b: any): number {
  const porGrupo = (PESO_DE_GRUPO[a.grupo] ?? 9) - (PESO_DE_GRUPO[b.grupo] ?? 9);
  if (porGrupo !== 0) return porGrupo;

  const porColor = String(a.color || '').localeCompare(String(b.color || ''), 'es');
  if (porColor !== 0) return porColor;

  return String(a.codigo || '').localeCompare(String(b.codigo || ''), 'es', {
    numeric: true,
  });
}

@Injectable()
export class RollosService {
  constructor(private prisma: PrismaService) {}

  // =========================================================================
  // CÓDIGO AUTOMÁTICO: R-000001, R-000002, ...
  // =========================================================================
  private async siguienteCodigo(): Promise<string> {
    const ultimo = await this.prisma.rolloTela.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });
    const siguiente = (ultimo?.id ?? 0) + 1;
    return `R-${String(siguiente).padStart(6, '0')}`;
  }

  // =========================================================================
  // LISTAR con filtros opcionales
  // -------------------------------------------------------------------------
  // Devuelve los rollos YA CLASIFICADOS y en orden, que es como se leen en la
  // pantalla y en el reporte:
  //
  //    1º  los que tienen kilos         → agrupados por color
  //    2º  los que están en 0 kg pero su tela sigue en el taller
  //    3º  (solo si se piden) los cerrados y los anulados
  //
  // Los CERRADOS no vienen por defecto: su tela ya llegó al almacén como
  // prenda y no hay nada que hacer con ellos. Se piden a propósito con
  // incluirCerrados / soloCerrados para consultar su detalle.
  // =========================================================================
  async listar(
    filtros: {
      estado?: string;
      color?: string;
      proveedorId?: number;
      incluirCerrados?: boolean;
      soloCerrados?: boolean;
    } = {},
  ) {
    const cerrados = filtros.soloCerrados
      ? { cerradoEn: { not: null } }
      : filtros.incluirCerrados
        ? {}
        : { cerradoEn: null };

    const rollos = await this.prisma.rolloTela.findMany({
      where: {
        // Por defecto escondemos los anulados: son errores de registro.
        ...(filtros.estado ? { estado: filtros.estado } : { estado: { not: 'ANULADO' } }),
        ...(filtros.color ? { color: filtros.color } : {}),
        ...(filtros.proveedorId ? { proveedorId: filtros.proveedorId } : {}),
        ...cerrados,
      },
      include: {
        proveedor: { select: { id: true, razonSocial: true } },
        insumo: { select: { id: true, nombre: true } },
        // Para saber si la tela que falta está todavía en el taller.
        consumos: {
          select: {
            pesoUsado: true,
            transformacion: {
              select: { id: true, codigo: true, estado: true, fecha: true },
            },
          },
        },
      },
    });

    return rollos.map((r) => this.clasificar(r)).sort(ordenDeAlmacen);
  }

  /**
   * Le agrega al rollo lo que la pantalla necesita saber de un vistazo:
   * en qué cortes anda su tela y a qué grupo pertenece.
   */
  private clasificar(rollo: any) {
    const { consumos, ...resto } = rollo;

    const cortes = (consumos || []).map((c: any) => ({
      id: c.transformacion?.id,
      codigo: c.transformacion?.codigo,
      estado: c.transformacion?.estado,
      fecha: c.transformacion?.fecha,
      kilos: Number(c.pesoUsado) || 0,
    }));

    const cortesPendientes = cortes.filter((c: any) =>
      ESTADOS_TRANSFORMACION_PENDIENTE.includes(c.estado),
    );

    const grupo =
      resto.estado === 'ANULADO'
        ? 'ANULADO'
        : resto.cerradoEn
          ? 'CERRADO'
          : Number(resto.pesoActual) > 0
            ? 'CON_KILOS'
            : cortesPendientes.length > 0
              ? 'EN_TRANSFORMACION'
              : 'SIN_KILOS';

    return {
      ...resto,
      cortes,
      cortesPendientes,
      enTransformacion: cortesPendientes.length > 0,
      cerrado: !!resto.cerradoEn,
      grupo,
    };
  }

  // =========================================================================
  // DISPONIBLES: lo que el cortador puede elegir (aún tiene kilos)
  // =========================================================================
  async disponibles() {
    return this.prisma.rolloTela.findMany({
      where: {
        estado: { in: ['DISPONIBLE', 'EN_USO'] },
        pesoActual: { gt: 0 },
      },
      include: { proveedor: { select: { razonSocial: true } } },
      orderBy: [{ color: 'asc' }, { id: 'asc' }],
    });
  }

  // =========================================================================
  // RESUMEN para las tarjetas de arriba de la vista
  // =========================================================================
  async resumen() {
    const todos = await this.prisma.rolloTela.findMany({
      where: { estado: { not: 'ANULADO' } },
      select: {
        color: true,
        pesoActual: true,
        pesoInicial: true,
        estado: true,
        costoPorKilo: true,
        cerradoEn: true,
      },
    });

    // Las tarjetas hablan del almacén de HOY, así que los rollos cerrados no
    // entran en los totales: su tela ya es prenda y está contada en el
    // almacén de terminados. Se informan aparte para que no "desaparezcan".
    const rollos = todos.filter((r) => !r.cerradoEn);
    const cerrados = todos.filter((r) => r.cerradoEn);

    let kilosDisponibles = 0;
    let kilosIngresados = 0;
    let valorInventario = 0;
    const porColor: Record<string, { kilos: number; rollos: number }> = {};

    for (const r of rollos) {
      const actual = Number(r.pesoActual);
      kilosDisponibles += actual;
      kilosIngresados += Number(r.pesoInicial);
      valorInventario += actual * Number(r.costoPorKilo);

      if (!porColor[r.color]) porColor[r.color] = { kilos: 0, rollos: 0 };
      porColor[r.color].kilos += actual;
      porColor[r.color].rollos += 1;
    }

    return {
      totalRollos: rollos.length,
      rollosDisponibles: rollos.filter((r) => Number(r.pesoActual) > 0).length,
      rollosConsumidos: rollos.filter((r) => Number(r.pesoActual) <= 0).length,
      // Rollos que ya se cerraron: toda su tela llegó al almacén como prenda.
      rollosCerrados: cerrados.length,
      kilosConvertidos: Number(
        cerrados.reduce((t, r) => t + Number(r.pesoInicial), 0).toFixed(3),
      ),
      kilosDisponibles: Number(kilosDisponibles.toFixed(3)),
      kilosIngresados: Number(kilosIngresados.toFixed(3)),
      kilosConsumidos: Number((kilosIngresados - kilosDisponibles).toFixed(3)),
      valorInventario: Number(valorInventario.toFixed(2)),
      porColor: Object.entries(porColor)
        .map(([color, d]) => ({ color, kilos: Number(d.kilos.toFixed(3)), rollos: d.rollos }))
        .sort((a, b) => b.kilos - a.kilos),
    };
  }

  // =========================================================================
  // REGISTRAR: uno o varios rollos de golpe
  // -------------------------------------------------------------------------
  // El caso típico: llega una compra de 20 rollos del mismo color. En vez de
  // llenar 20 formularios, se manda una lista de pesos y se crean los 20.
  // =========================================================================
  async registrar(data: {
    color: string;
    colorCodigo?: string;
    descripcion?: string;
    costoPorKilo?: number;
    proveedorId?: number | null;
    insumoId?: number | null;
    observacion?: string;
    // Lista de pesos: [25.4, 23.1, 24.8] crea 3 rollos
    pesos: number[];
  }) {
    if (!data.color || !String(data.color).trim()) {
      throw new BadRequestException('El color de la tela es obligatorio.');
    }

    const pesos = (data.pesos || [])
      .map((p) => Number(p))
      .filter((p) => !isNaN(p) && p > 0);

    if (pesos.length === 0) {
      throw new BadRequestException('Indica el peso en kilos de al menos un rollo.');
    }

    const costoPorKilo = Number(data.costoPorKilo ?? 0);
    if (costoPorKilo < 0) {
      throw new BadRequestException('El costo por kilo no puede ser negativo.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Reservamos el bloque de códigos de una sola vez para que dos usuarios
      // registrando al mismo tiempo no se peleen por el mismo correlativo.
      const ultimo = await tx.rolloTela.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true },
      });
      let correlativo = (ultimo?.id ?? 0);

      const creados: any[] = [];

      for (const peso of pesos) {
        correlativo += 1;
        const rollo = await tx.rolloTela.create({
          data: {
            codigo: `R-${String(correlativo).padStart(6, '0')}`,
            descripcion: data.descripcion?.trim() || null,
            color: String(data.color).trim(),
            colorCodigo: data.colorCodigo?.trim().toUpperCase() || null,
            pesoInicial: peso,
            pesoActual: peso,
            costoPorKilo,
            estado: 'DISPONIBLE',
            observacion: data.observacion?.trim() || null,
            proveedorId: data.proveedorId ? Number(data.proveedorId) : null,
            insumoId: data.insumoId ? Number(data.insumoId) : null,
          },
        });

        await tx.movimientoRollo.create({
          data: {
            rolloId: rollo.id,
            tipo: 'INGRESO',
            peso,
            pesoResultante: peso,
            motivo: data.proveedorId
              ? `Ingreso de tela — proveedor #${data.proveedorId}`
              : 'Ingreso de tela al almacén',
          },
        });

        creados.push(rollo);
      }

      return { cantidad: creados.length, rollos: creados };
    });
  }

  // =========================================================================
  // AJUSTE DE PESO: la balanza dijo otra cosa, o sobró tela que volvió
  // =========================================================================
  async ajustarPeso(id: number, data: { pesoReal: number; motivo?: string }) {
    const rollo = await this.prisma.rolloTela.findUnique({ where: { id } });
    if (!rollo) throw new NotFoundException(`No existe el rollo #${id}.`);

    const pesoReal = Number(data.pesoReal);
    if (isNaN(pesoReal) || pesoReal < 0) {
      throw new BadRequestException('El peso real no puede ser negativo.');
    }

    const diferencia = pesoReal - Number(rollo.pesoActual);

    return this.prisma.$transaction(async (tx) => {
      const actualizado = await tx.rolloTela.update({
        where: { id },
        data: {
          pesoActual: pesoReal,
          estado: pesoReal <= 0 ? 'CONSUMIDO' : rollo.estado === 'CONSUMIDO' ? 'EN_USO' : rollo.estado,
        },
      });

      await tx.movimientoRollo.create({
        data: {
          rolloId: id,
          tipo: 'AJUSTE',
          peso: diferencia,
          pesoResultante: pesoReal,
          motivo: data.motivo?.trim() || 'Ajuste manual de peso (reconteo en balanza)',
        },
      });

      // Si quedó en 0 y no tiene cortes pendientes, se cierra. Si volvió a
      // tener kilos, se reabre. La regla vive en cierre-rollos.ts.
      const cierre = await recalcularCierreRollos(tx, [id]);

      // Releemos para devolver el rollo como quedó (incluido cerradoEn).
      const fresco = await tx.rolloTela.findUnique({ where: { id } });
      return { ...(fresco || actualizado), ...cierre };
    });
  }

  // =========================================================================
  // ANULAR: se registró por error. Solo si nadie le sacó tela todavía.
  // =========================================================================
  async anular(id: number, motivo?: string) {
    const rollo = await this.prisma.rolloTela.findUnique({
      where: { id },
      include: { consumos: true },
    });
    if (!rollo) throw new NotFoundException(`No existe el rollo #${id}.`);

    if (rollo.consumos.length > 0) {
      throw new BadRequestException(
        `El rollo ${rollo.codigo} ya se usó en ${rollo.consumos.length} corte(s). ` +
          'No se puede anular: anula primero la transformación o ajústale el peso.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const anulado = await tx.rolloTela.update({
        where: { id },
        data: { estado: 'ANULADO', pesoActual: 0 },
      });

      await tx.movimientoRollo.create({
        data: {
          rolloId: id,
          tipo: 'AJUSTE',
          peso: -Number(rollo.pesoActual),
          pesoResultante: 0,
          motivo: motivo?.trim() || 'Rollo anulado (registrado por error)',
        },
      });

      return anulado;
    });
  }

  // =========================================================================
  // HISTORIAL de un rollo: cada kilo que entró y salió
  // =========================================================================
  async historial(id: number) {
    const rollo = await this.prisma.rolloTela.findUnique({
      where: { id },
      include: {
        proveedor: { select: { razonSocial: true } },
        movimientos: { orderBy: { fecha: 'asc' } },
        consumos: {
          include: {
            transformacion: {
              select: { id: true, codigo: true, fecha: true, estado: true, producto: { select: { nombre: true } } },
            },
          },
        },
      },
    });
    if (!rollo) throw new NotFoundException(`No existe el rollo #${id}.`);
    return rollo;
  }
}
