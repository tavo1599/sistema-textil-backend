import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
  // =========================================================================
  async listar(filtros: { estado?: string; color?: string; proveedorId?: number } = {}) {
    return this.prisma.rolloTela.findMany({
      where: {
        // Por defecto escondemos los anulados: son errores de registro.
        ...(filtros.estado ? { estado: filtros.estado } : { estado: { not: 'ANULADO' } }),
        ...(filtros.color ? { color: filtros.color } : {}),
        ...(filtros.proveedorId ? { proveedorId: filtros.proveedorId } : {}),
      },
      include: {
        proveedor: { select: { id: true, razonSocial: true } },
        insumo: { select: { id: true, nombre: true } },
      },
      orderBy: [{ estado: 'asc' }, { id: 'desc' }],
    });
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
    const rollos = await this.prisma.rolloTela.findMany({
      where: { estado: { not: 'ANULADO' } },
      select: { color: true, pesoActual: true, pesoInicial: true, estado: true, costoPorKilo: true },
    });

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

      return actualizado;
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
