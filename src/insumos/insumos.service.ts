import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InsumoKardexService } from '../kardex/insumo-kardex.service';

@Injectable()
export class InsumosService {
  constructor(
    private prisma: PrismaService,
    private insumoKardex: InsumoKardexService,
  ) {}

  // ==========================================================================
  // CÓDIGO ÚNICO AUTOMÁTICO
  // --------------------------------------------------------------------------
  // El usuario ya no escribe el código: se arma solo según la categoría.
  //   Tela     -> TEL-000001
  //   Avío     -> AVI-000001
  //   Empaque  -> EMP-000001
  //   Etiqueta -> ETQ-000001
  // ==========================================================================
  private prefijoDe(tipo?: string): string {
    const t = String(tipo || '')
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (t.startsWith('TELA')) return 'TEL';
    if (t.startsWith('AVIO')) return 'AVI';
    if (t.startsWith('EMPAQUE')) return 'EMP';
    if (t.startsWith('ETIQUETA')) return 'ETQ';
    return 'MAT';
  }

  /**
   * Devuelve el siguiente código libre del prefijo. Toma el correlativo más
   * alto que ya exista y sigue subiendo hasta encontrar uno que nadie use, así
   * no choca aunque alguien haya escrito códigos a mano antes.
   */
  private async siguienteCodigo(tx: any, tipo?: string): Promise<string> {
    const prefijo = this.prefijoDe(tipo);
    const usados: { codigo: string }[] = await tx.insumo.findMany({
      where: { codigo: { startsWith: `${prefijo}-` } },
      select: { codigo: true },
    });

    let maximo = 0;
    for (const { codigo } of usados) {
      const n = Number(String(codigo).slice(prefijo.length + 1));
      if (Number.isFinite(n) && n > maximo) maximo = n;
    }

    for (let intento = 1; intento <= 100; intento++) {
      const candidato = `${prefijo}-${String(maximo + intento).padStart(6, '0')}`;
      const ocupado = await tx.insumo.findUnique({ where: { codigo: candidato } });
      if (!ocupado) return candidato;
    }

    throw new BadRequestException(
      'No se pudo generar un código único para el material. Intenta de nuevo.',
    );
  }

  /** El proveedor es opcional, pero si lo mandan tiene que existir. */
  private async validarProveedor(tx: any, proveedorId?: any): Promise<number | null> {
    const id = Number(proveedorId);
    if (!proveedorId || !Number.isFinite(id) || id <= 0) return null;
    const proveedor = await tx.proveedor.findUnique({ where: { id } });
    if (!proveedor) throw new BadRequestException(`El proveedor #${id} no existe.`);
    return id;
  }

  // 1. CREAR
  async create(data: any) {
    const nombre = String(data.nombre || '').trim();
    if (!nombre) throw new BadRequestException('El nombre del material es obligatorio.');

    // El peso / la cantidad que llegó. Es INFORMATIVO: dice cuánto entró al
    // almacén, no se descuenta en Transformación (eso lo hacen los rollos).
    const stockInicial = Number(data.stockActual) || 0;
    // El precio es OPCIONAL: si no lo saben todavía, entra en 0 y se corrige
    // después con una compra o con una edición.
    const costoUnitario = Number(data.costoUnitario) || 0;

    return this.prisma.$transaction(async (tx) => {
      const codigoPedido = String(data.codigo || '').trim();
      if (codigoPedido) {
        // Solo pasa si alguien llama a la API a mano con un código propio.
        const existe = await tx.insumo.findUnique({ where: { codigo: codigoPedido } });
        if (existe) throw new BadRequestException(`El código ${codigoPedido} ya está registrado.`);
      }
      const codigo = codigoPedido || (await this.siguienteCodigo(tx, data.tipo));
      const proveedorId = await this.validarProveedor(tx, data.proveedorId);

      // Creamos el insumo SIN stock; el stock se carga vía kardex para dejar rastro.
      const insumo = await tx.insumo.create({
        data: {
          codigo,
          nombre,
          tipo: data.tipo,
          unidadMedida: data.unidadMedida,
          costoUnitario: costoUnitario,
          stockActual: 0,
          color: String(data.color || '').trim() || null,
          proveedorId,
        },
      });

      // Si trae stock inicial, lo registramos como INGRESO en el kardex
      // (esto también deja stockActual en el valor correcto).
      if (stockInicial > 0) {
        await this.insumoKardex.registrarIngreso(tx, {
          insumoId: insumo.id,
          cantidad: stockInicial,
          costoUnitario: costoUnitario,
          motivo: 'Stock inicial (alta de insumo)',
          tipoMovimiento: 'INGRESO',
        });
      }

      return tx.insumo.findUnique({ where: { id: insumo.id } });
    });
  }

  // 2. LEER TODOS
  // Adjuntamos el nombre del proveedor a mano porque proveedorId no tiene
  // llave foránea (ver el comentario del modelo Insumo). La tabla de
  // proveedores es chica, así que traerla completa no cuesta nada.
  async findAll() {
    const [insumos, proveedores] = await Promise.all([
      this.prisma.insumo.findMany({ orderBy: { id: 'desc' } }),
      this.prisma.proveedor.findMany({ select: { id: true, razonSocial: true } }),
    ]);

    const nombrePorId = new Map(proveedores.map((p) => [p.id, p.razonSocial]));

    return insumos.map((insumo) => ({
      ...insumo,
      proveedorNombre: insumo.proveedorId ? nombrePorId.get(insumo.proveedorId) ?? null : null,
    }));
  }

  // 3. LEER UNO
  async findOne(id: number) {
    const insumo = await this.prisma.insumo.findUnique({ where: { id } });
    if (!insumo) throw new NotFoundException('Insumo no encontrado');
    return insumo;
  }

  // 4. ACTUALIZAR (EDITAR)
  async update(id: number, data: any) {
    const insumo = await this.findOne(id);

    const stockNuevo = Number(data.stockActual);
    const stockAnterior = Number(insumo.stockActual);

    return this.prisma.$transaction(async (tx) => {
      // Actualizamos los datos descriptivos (el stock NO se toca aquí directamente).
      const proveedorId = await this.validarProveedor(tx, data.proveedorId);
      const costoEditado = Number(data.costoUnitario);

      await tx.insumo.update({
        where: { id },
        data: {
          // El código ya no se edita desde la pantalla; si no llega, se queda
          // el que se generó al registrar el material.
          ...(String(data.codigo || '').trim()
            ? { codigo: String(data.codigo).trim() }
            : {}),
          nombre: data.nombre,
          tipo: data.tipo,
          unidadMedida: data.unidadMedida,
          // El precio es opcional: si no lo mandan, no lo pisamos con un 0.
          ...(Number.isFinite(costoEditado) ? { costoUnitario: costoEditado } : {}),
          color: String(data.color || '').trim() || null,
          proveedorId,
        },
      });

      // Si el usuario cambió el stock a mano, lo registramos como AJUSTE en el kardex,
      // así el historial nunca se desincroniza del stock real.
      if (!isNaN(stockNuevo) && stockNuevo !== stockAnterior) {
        const delta = stockNuevo - stockAnterior;
        if (delta > 0) {
          await this.insumoKardex.registrarIngreso(tx, {
            insumoId: id,
            cantidad: delta,
            costoUnitario: Number.isFinite(costoEditado)
              ? costoEditado
              : Number(insumo.costoUnitario),
            motivo: 'Ajuste manual de stock (edición)',
            tipoMovimiento: 'AJUSTE',
          });
        } else {
          await this.insumoKardex.registrarSalida(tx, {
            insumoId: id,
            cantidad: Math.abs(delta),
            costoUnitario: Number.isFinite(costoEditado)
              ? costoEditado
              : Number(insumo.costoUnitario),
            motivo: 'Ajuste manual de stock (edición)',
            tipoMovimiento: 'AJUSTE',
          });
        }
      }

      return tx.insumo.findUnique({ where: { id } });
    });
  }

  // 5. ELIMINAR
async remove(id: number) {
  try {
    await this.findOne(id); // Verificamos que exista
    return await this.prisma.insumo.delete({ where: { id } });
  } catch (error: any) {
    // Si el error es de Prisma P2003 (Foreign key constraint failed)
    if (error.code === 'P2003') {
      throw new BadRequestException(
        'No se puede eliminar: Este insumo ya está siendo usado en una Ficha Técnica o en una Orden de Producción.'
      );
    }
    throw error;
  }
}
}