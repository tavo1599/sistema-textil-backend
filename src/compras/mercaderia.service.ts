import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KardexService } from '../kardex/kardex.service';

/**
 * MercaderiaService — COMPRA DE ROPA YA HECHA (simplificada)
 * ===========================================================================
 * Nuestra producción se maneja por COLOR y TALLA porque la cortamos nosotros.
 * La mercadería que COMPRAMOS ya hecha se maneja GENERAL: solo cantidad.
 *
 * Por eso toda la mercadería entra al inventario con esta variante fija:
 *
 *      color = 'GENERAL'      talla = 'UNICA'
 *
 * No es un parche: es lo que permite que el Punto de Venta, el kardex, los
 * traslados y los reportes sigan funcionando IGUAL, sin una segunda lógica
 * de venta. Al vender, el cajero solo jala la prenda y cobra; el ajuste fino
 * por talla y color lo hace el cliente en su tienda.
 *
 * Lo único que se registra por compra es lo mínimo para no perder mercadería:
 *      nombre · cantidad · precio de compra · precio de venta · N° de factura
 *
 * Al registrarla, cada prenda recibe un CÓDIGO DE BARRAS corto y numérico
 * (ej: 000123) para imprimir, pegar y vender con la pistola.
 */

export const COLOR_GENERAL = 'GENERAL';
export const TALLA_UNICA = 'UNICA';

@Injectable()
export class MercaderiaService {
  constructor(
    private prisma: PrismaService,
    private kardex: KardexService,
  ) {}

  // =========================================================================
  // CÓDIGO DE BARRAS: 6 dígitos a partir del id del producto.
  // Corto, numérico y único. Si la pistola falla, el cajero lo teclea a mano.
  // =========================================================================
  private codigoDeProducto(productoId: number): string {
    return String(productoId).padStart(6, '0');
  }

  // =========================================================================
  // PROVEEDOR POR DEFECTO: para no bloquear la compra si no lo tienen a mano
  // =========================================================================
  private async proveedorPorDefecto(tx: any): Promise<number> {
    const existente = await tx.proveedor.findFirst({
      where: { razonSocial: 'PROVEEDOR VARIOS' },
    });
    if (existente) return existente.id;

    const creado = await tx.proveedor.create({
      data: { razonSocial: 'PROVEEDOR VARIOS', tipo: 'MERCADERIA' },
    });
    return creado.id;
  }

  // =========================================================================
  // CATÁLOGO DE MERCADERÍA: lo que se compró, con su stock y su código
  // =========================================================================
  async catalogo() {
    const productos = await this.prisma.producto.findMany({
      where: { esMercaderia: true },
      include: {
        inventarios: { include: { bodega: { select: { id: true, nombre: true } } } },
        costosPromedio: true,
      },
      orderBy: { nombre: 'asc' },
    });

    return productos.map((p) => {
      const stockTotal = p.inventarios.reduce((s, i) => s + i.stock, 0);
      const costo = p.costosPromedio[0] ? Number(p.costosPromedio[0].costoPromedio) : 0;
      const precio = Number(p.precioMinorista);

      return {
        id: p.id,
        nombre: p.nombre,
        skuBase: p.skuBase,
        codigoBarras: p.codigoBarras || this.codigoDeProducto(p.id),
        precioMinorista: precio,
        precioMayorista: Number(p.precioMayorista),
        costoPromedio: Number(costo.toFixed(2)),
        // Margen: cuánto ganamos sobre el costo. Si sale negativo, estamos
        // vendiendo por debajo de lo que compramos.
        margen: precio > 0 && costo > 0 ? Number((((precio - costo) / precio) * 100).toFixed(1)) : 0,
        stockTotal,
        porBodega: p.inventarios
          .filter((i) => i.stock !== 0)
          .map((i) => ({ bodegaId: i.bodegaId, bodega: i.bodega.nombre, stock: i.stock })),
      };
    });
  }

  // =========================================================================
  // HISTORIAL de compras de mercadería
  // =========================================================================
  async historial(filtros: { desde?: string; hasta?: string } = {}) {
    const where: any = { detalles: { some: { tipoItem: 'PRENDA' } } };
    if (filtros.desde || filtros.hasta) {
      where.fecha = {};
      if (filtros.desde) where.fecha.gte = new Date(`${filtros.desde}T00:00:00`);
      if (filtros.hasta) where.fecha.lte = new Date(`${filtros.hasta}T23:59:59`);
    }

    const compras = await this.prisma.compra.findMany({
      where,
      include: {
        proveedor: { select: { razonSocial: true } },
        detalles: {
          where: { tipoItem: 'PRENDA' },
          include: { producto: { select: { id: true, nombre: true, codigoBarras: true } } },
        },
      },
      orderBy: { fecha: 'desc' },
      take: 200,
    });

    return compras.map((c) => ({
      id: c.id,
      factura: c.correlativo,
      fecha: c.fecha,
      proveedor: c.proveedor.razonSocial,
      total: Number(c.totalCompra),
      unidades: c.detalles.reduce((s, d) => s + d.cantidad, 0),
      lineas: c.detalles.map((d) => ({
        producto: d.producto?.nombre ?? '(prenda eliminada)',
        productoId: d.productoId,
        codigoBarras: d.producto?.codigoBarras ?? d.skuProveedor,
        cantidad: d.cantidad,
        costoUnitario: Number(d.costoUnitario),
        subtotal: Number(d.subtotal),
      })),
    }));
  }

  // =========================================================================
  // REGISTRAR LA COMPRA — el corazón del módulo
  // =========================================================================
  async registrar(data: {
    numeroFactura: string;
    bodegaDestinoId: number;
    proveedorId?: number | null;
    proveedorNombre?: string;
    items: {
      productoId?: number | null; // si ya existe en el catálogo
      nombre?: string; // si es nuevo
      cantidad: number;
      costoUnitario: number; // precio al que COMPRAMOS
      precioVenta: number; // precio al que NOSOTROS vendemos (minorista)
      precioMayorista?: number; // opcional
    }[];
  }) {
    // ---------------- Validaciones con mensajes entendibles ----------------
    // El número de boleta/factura es OPCIONAL: si no lo ponen, generamos un
    // correlativo interno único para que la compra igual quede registrada.
    const facturaManual = String(data.numeroFactura || '').trim().toUpperCase();
    const factura = facturaManual || `S/B-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const items = (data.items || [])
      .map((i) => ({
        productoId: i.productoId ? Number(i.productoId) : null,
        nombre: String(i.nombre || '').trim(),
        cantidad: Math.trunc(Number(i.cantidad) || 0),
        costoUnitario: Number(i.costoUnitario) || 0,
        precioVenta: Number(i.precioVenta) || 0,
        precioMayorista: Number(i.precioMayorista ?? 0) || 0,
      }))
      .filter((i) => i.cantidad > 0 && (i.productoId || i.nombre));

    if (items.length === 0) {
      throw new BadRequestException('Agrega al menos una prenda con su cantidad.');
    }

    for (const i of items) {
      if (i.costoUnitario < 0 || i.precioVenta < 0) {
        throw new BadRequestException('Los precios no pueden ser negativos.');
      }
    }

    // La factura duplicada casi siempre es doble registro por error — pero solo
    // tiene sentido avisar cuando el usuario SÍ escribió una (las autogeneradas
    // son únicas).
    if (facturaManual) {
      const yaExiste = await this.prisma.compra.findUnique({ where: { correlativo: factura } });
      if (yaExiste) {
        throw new ConflictException(
          `La factura ${factura} ya está registrada (compra #${yaExiste.id}). ` +
            'Si de verdad es otra compra, agrégale un sufijo: por ejemplo ' +
            `${factura}-2.`,
        );
      }
    }

    // La bodega de destino también es opcional: si no la eligen, entra a la
    // bodega Principal (o a la primera que haya).
    let bodega = data.bodegaDestinoId
      ? await this.prisma.bodega.findUnique({ where: { id: Number(data.bodegaDestinoId) } })
      : null;
    if (!bodega) {
      bodega =
        (await this.prisma.bodega.findFirst({ where: { tipo: 'Principal', estado: true } })) ||
        (await this.prisma.bodega.findFirst({ where: { estado: true } })) ||
        (await this.prisma.bodega.findFirst());
    }
    if (!bodega) throw new NotFoundException('No hay ninguna bodega registrada para recibir la mercadería.');
    data.bodegaDestinoId = bodega.id;

    // ------------------------------- Transacción -------------------------------
    return this.prisma.$transaction(async (tx) => {
      // 1. Proveedor
      let proveedorId = data.proveedorId ? Number(data.proveedorId) : null;
      if (!proveedorId && data.proveedorNombre?.trim()) {
        const nombre = data.proveedorNombre.trim();
        const existente = await tx.proveedor.findFirst({ where: { razonSocial: nombre } });
        proveedorId = existente
          ? existente.id
          : (await tx.proveedor.create({ data: { razonSocial: nombre, tipo: 'MERCADERIA' } })).id;
      }
      if (!proveedorId) proveedorId = await this.proveedorPorDefecto(tx);

      // 2. Resolver cada línea: producto existente o producto nuevo
      const lineas: any[] = [];
      let totalCompra = 0;

      for (const item of items) {
        let producto: any = null;

        if (item.productoId) {
          producto = await tx.producto.findUnique({ where: { id: item.productoId } });
          if (!producto) throw new NotFoundException(`No existe la prenda #${item.productoId}.`);
        } else {
          // Prenda nueva: la creamos marcada como mercadería comprada.
          // skuBase provisional porque es @unique; se corrige abajo con el id real.
          producto = await tx.producto.create({
            data: {
              skuBase: `MER-TMP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
              nombre: item.nombre,
              categoria: 'MERCADERIA',
              esMercaderia: true,
              precioMinorista: item.precioVenta,
              precioMayorista: item.precioMayorista || item.precioVenta,
            },
          });
          producto = await tx.producto.update({
            where: { id: producto.id },
            data: {
              skuBase: `MER-${String(producto.id).padStart(5, '0')}`,
              codigoBarras: this.codigoDeProducto(producto.id),
            },
          });
        }

        // Si es una prenda que ya existía pero nunca tuvo código, se lo damos.
        if (!producto.codigoBarras) {
          producto = await tx.producto.update({
            where: { id: producto.id },
            data: { codigoBarras: this.codigoDeProducto(producto.id) },
          });
        }

        // Los precios de venta se actualizan en cada compra: el último precio
        // que escribió el usuario es el que vale.
        const cambios: any = {};
        if (item.precioVenta > 0) cambios.precioMinorista = item.precioVenta;
        if (item.precioMayorista > 0) cambios.precioMayorista = item.precioMayorista;
        if (!producto.esMercaderia && !item.productoId) cambios.esMercaderia = true;
        if (Object.keys(cambios).length > 0) {
          producto = await tx.producto.update({ where: { id: producto.id }, data: cambios });
        }

        const subtotal = Number((item.cantidad * item.costoUnitario).toFixed(2));
        totalCompra += subtotal;

        lineas.push({ ...item, producto, subtotal });
      }

      // 3. Cabecera + detalle de la compra
      const compra = await tx.compra.create({
        data: {
          correlativo: factura,
          proveedorId,
          totalCompra: Number(totalCompra.toFixed(2)),
          estado: 'COMPLETADA',
          detalles: {
            create: lineas.map((l) => ({
              tipoItem: 'PRENDA',
              productoId: l.producto.id,
              color: COLOR_GENERAL,
              talla: TALLA_UNICA,
              skuProveedor: l.producto.codigoBarras,
              cantidad: l.cantidad,
              costoUnitario: l.costoUnitario,
              subtotal: l.subtotal,
            })),
          },
        },
      });

      // 4. Ingreso al inventario valorizado (variante GENERAL/UNICA)
      for (const l of lineas) {
        await this.kardex.registrarIngreso(tx, {
          productoId: l.producto.id,
          color: COLOR_GENERAL,
          talla: TALLA_UNICA,
          bodegaId: Number(data.bodegaDestinoId),
          cantidad: l.cantidad,
          costoUnitario: l.costoUnitario,
          motivo: `COMPRA MERCADERÍA ${factura}`,
          tipoMovimiento: 'INGRESO',
          referenciaId: compra.id,
          actualizarStockFisico: true,
        });
      }

      // 5. Devolvemos lo necesario para imprimir los códigos de una vez
      return {
        compraId: compra.id,
        factura,
        total: Number(totalCompra.toFixed(2)),
        unidades: lineas.reduce((s, l) => s + l.cantidad, 0),
        bodega: bodega.nombre,
        etiquetas: lineas.map((l) => ({
          productoId: l.producto.id,
          nombre: l.producto.nombre,
          codigoBarras: l.producto.codigoBarras,
          precio: Number(l.producto.precioMinorista),
          cantidad: l.cantidad,
        })),
      };
    });
  }

  // =========================================================================
  // ASIGNAR CÓDIGOS QUE FALTEN
  // -------------------------------------------------------------------------
  // Para la mercadería que ya estaba registrada antes de este módulo y quedó
  // sin código de barras. No toca nada más.
  // =========================================================================
  async asignarCodigosFaltantes() {
    const sinCodigo = await this.prisma.producto.findMany({
      where: { esMercaderia: true, codigoBarras: null },
      select: { id: true, nombre: true },
    });

    const asignados: any[] = [];
    for (const p of sinCodigo) {
      const actualizado = await this.prisma.producto.update({
        where: { id: p.id },
        data: { codigoBarras: this.codigoDeProducto(p.id) },
      });
      asignados.push({ id: p.id, nombre: p.nombre, codigoBarras: actualizado.codigoBarras });
    }

    return { cantidad: asignados.length, asignados };
  }
}
