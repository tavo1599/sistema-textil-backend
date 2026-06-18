import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VentasService } from '../ventas/ventas.service';
import { EmailService } from '../email/email.service';

/**
 * Almacén que abastece la tienda web. La web solo ofrece/valida/descuenta
 * stock de las bodegas tipo "Principal" (no de sucursales ni merma).
 * Para mover algo a la web, se traslada al Almacén Principal.
 */
const BODEGA_WEB = { tipo: 'Principal' } as const;

/**
 * TiendaService — Catálogo PÚBLICO para la tienda online (Nuxt).
 * Solo expone productos con publicadoWeb = true y datos seguros
 * (nunca costos internos, márgenes ni stock por bodega).
 * El stock se devuelve agregado (total disponible) por variante.
 */
@Injectable()
export class TiendaService {
  constructor(
    private prisma: PrismaService,
    private ventasService: VentasService,
    private email: EmailService,
  ) {}

  // Lista de productos publicados, con su precio web e imagen.
  async listarCatalogo(filtros?: { categoria?: string; q?: string }) {
    const productos = await this.prisma.producto.findMany({
      where: {
        publicadoWeb: true,
        ...(filtros?.categoria ? { categoria: filtros.categoria } : {}),
        ...(filtros?.q
          ? { nombre: { contains: filtros.q, mode: 'insensitive' } }
          : {}),
      },
      select: {
        id: true,
        skuBase: true,
        nombre: true,
        categoria: true,
        descripcionWeb: true,
        imagenUrl: true,
        imagenLocal: true,
        precioWeb: true,
        imagenes: {
          select: { url: true, color: true, orden: true },
          orderBy: { orden: 'asc' },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    // Stock disponible para la WEB = solo el Almacén Principal (no otros almacenes).
    const productoIds = productos.map((p) => p.id);
    const stock = productoIds.length
      ? await this.prisma.inventarioTerminado.groupBy({
          by: ['productoId'],
          where: { productoId: { in: productoIds }, stock: { gt: 0 }, bodega: BODEGA_WEB },
          _sum: { stock: true },
        })
      : [];
    const stockMap = new Map(stock.map((s) => [s.productoId, s._sum.stock ?? 0]));

    return productos.map((p) => {
      const galeria = (p as any).imagenes as { url: string }[];
      // Imagen principal y secundaria (para el efecto frente/espalda en hover)
      const imagen = galeria[0]?.url ?? p.imagenUrl ?? p.imagenLocal ?? null;
      const imagenHover = galeria[1]?.url ?? null;
      return {
        id: p.id,
        sku: p.skuBase,
        nombre: p.nombre,
        categoria: p.categoria,
        descripcion: p.descripcionWeb,
        imagen,
        imagenHover,
        precio: Number(p.precioWeb),
        disponible: (stockMap.get(p.id) ?? 0) > 0,
      };
    });
  }

  async guardarLogo(url: string) {
    return this.prisma.configTienda.upsert({
      where: { id: 1 },
      update: { logo: url },
      create: { id: 1, logo: url },
    });
  }

  // ====== PEDIDOS WEB ======

  // Crea un pedido desde la tienda. El precio se toma del servidor (precioWeb),
  // NUNCA del cliente, para que no puedan manipularlo. No descuenta stock.
  async crearPedido(dto: any) {
    const items = Array.isArray(dto.items) ? dto.items : [];
    if (items.length === 0) throw new BadRequestException('El carrito está vacío.');
    if (!dto.clienteNombre || !dto.telefono) {
      throw new BadRequestException('Nombre y teléfono son obligatorios.');
    }

    // Traemos los productos reales para fijar precios y nombres del servidor
    const ids = [...new Set(items.map((i: any) => Number(i.productoId)))] as number[];
    const productos = await this.prisma.producto.findMany({
      where: { id: { in: ids }, publicadoWeb: true },
      select: { id: true, nombre: true, precioWeb: true },
    });
    const mapa = new Map(productos.map((p) => [p.id, p]));

    let total = 0;
    const detalles = items.map((it: any) => {
      const prod = mapa.get(Number(it.productoId));
      if (!prod) throw new BadRequestException(`Producto ${it.productoId} no disponible.`);
      const cantidad = Math.max(1, Number(it.cantidad) || 1);
      const precioUnitario = Number(prod.precioWeb);
      const subtotal = precioUnitario * cantidad;
      total += subtotal;
      return {
        productoId: prod.id,
        nombre: prod.nombre,
        color: String(it.color || 'N/A'),
        talla: String(it.talla || 'N/A'),
        cantidad,
        precioUnitario,
        subtotal,
      };
    });

    // 🔒 VALIDACIÓN DE STOCK: nadie puede pedir más de lo que hay disponible
    // para la web (solo Almacén Principal). Acumulamos por variante por si el
    // carrito trae el mismo producto/color/talla repetido.
    const pedidoPorVariante = new Map<string, number>();
    for (const d of detalles) {
      const k = `${d.productoId}|${d.color}|${d.talla}`;
      pedidoPorVariante.set(k, (pedidoPorVariante.get(k) || 0) + d.cantidad);
    }
    for (const [k, cant] of pedidoPorVariante) {
      const [pid, color, talla] = k.split('|');
      const agg = await this.prisma.inventarioTerminado.aggregate({
        where: {
          productoId: Number(pid),
          color,
          talla,
          bodega: BODEGA_WEB,
        },
        _sum: { stock: true },
      });
      const disponible = agg._sum.stock ?? 0;
      if (cant > disponible) {
        const nombre = mapa.get(Number(pid))?.nombre ?? `Producto ${pid}`;
        throw new BadRequestException(
          `Stock insuficiente de "${nombre}" (${color} / ${talla}). Disponible: ${disponible}, pediste: ${cant}.`,
        );
      }
    }

    // Correlativo secuencial seguro
    const ultimo = await this.prisma.pedidoWeb.findFirst({
      orderBy: { id: 'desc' },
      select: { codigo: true },
    });
    let siguiente = 1;
    if (ultimo?.codigo) {
      const m = ultimo.codigo.match(/(\d+)$/);
      if (m) siguiente = parseInt(m[1], 10) + 1;
    }
    const codigo = `WEB-${String(siguiente).padStart(5, '0')}`;

    // 🎟️ CUPÓN: el descuento se calcula en el SERVIDOR (nunca se confía en el cliente)
    const subtotal = Number(total.toFixed(2));
    let descuento = 0;
    let cuponAplicado: any = null;
    if (dto.cuponCodigo) {
      const r = await this.evaluarCupon(dto.cuponCodigo, subtotal);
      descuento = r.descuento;
      cuponAplicado = r.cupon;
    }
    const totalFinal = Number((subtotal - descuento).toFixed(2));

    const pedido = await this.prisma.pedidoWeb.create({
      data: {
        codigo,
        clienteNombre: dto.clienteNombre,
        documento: dto.documento ?? null,
        telefono: dto.telefono,
        email: dto.email ?? null,
        direccion: dto.direccion ?? null,
        metodoEntrega: dto.metodoEntrega || 'ENVIO',
        metodoPago: dto.metodoPago ?? null,
        voucherUrl: dto.voucherUrl ?? null,
        notas: dto.notas ?? null,
        cuponCodigo: cuponAplicado ? cuponAplicado.codigo : null,
        subtotal,
        descuento,
        total: totalFinal,
        detalles: { create: detalles },
      },
    });

    // Contamos el uso del cupón
    if (cuponAplicado) {
      await this.prisma.cuponDescuento.update({
        where: { id: cuponAplicado.id },
        data: { usos: { increment: 1 } },
      });
    }

    // 📧 Correo de confirmación al cliente (no bloquea ni rompe la compra si falla)
    if (pedido.email) {
      const config = await this.obtenerConfig();
      const pedidoCompleto = { ...pedido, detalles };
      this.email.enviarConfirmacionPedido(pedidoCompleto, config).catch(() => {});
    }

    return {
      mensaje: 'Pedido recibido',
      codigo: pedido.codigo,
      subtotal,
      descuento,
      total: totalFinal,
    };
  }

  // Seguimiento público: requiere código + teléfono (evita que cualquiera vea pedidos ajenos).
  async seguimiento(codigo: string, telefono: string) {
    const pedido = await this.prisma.pedidoWeb.findFirst({
      where: { codigo: String(codigo).trim().toUpperCase() },
      include: { detalles: true },
    });
    if (!pedido) throw new NotFoundException('No encontramos un pedido con ese código.');

    const telLimpio = String(telefono || '').replace(/\D/g, '');
    const telPedido = String(pedido.telefono || '').replace(/\D/g, '');
    if (!telLimpio || telLimpio !== telPedido) {
      throw new BadRequestException('El teléfono no coincide con el del pedido.');
    }

    return {
      codigo: pedido.codigo,
      estado: pedido.estado,
      fecha: pedido.fecha,
      metodoEntrega: pedido.metodoEntrega,
      total: Number(pedido.total),
      items: pedido.detalles.map((d) => ({
        nombre: d.nombre, color: d.color, talla: d.talla, cantidad: d.cantidad,
      })),
    };
  }

  // Admin: lista de pedidos web
  async listarPedidos() {
    return this.prisma.pedidoWeb.findMany({
      orderBy: { fecha: 'desc' },
      include: { detalles: true },
    });
  }

  // Admin: cambiar estado del pedido
  async cambiarEstadoPedido(id: number, estado: string) {
    return this.prisma.pedidoWeb.update({ where: { id }, data: { estado } });
  }

  // Admin: CONFIRMAR el pedido = convertirlo en Venta real (descuenta stock).
  // Reutiliza VentasService para que sea idéntico a una venta del POS:
  // valida stock, descuenta inventario (kardex) y genera correlativo.
  async convertirPedidoEnVenta(id: number, bodegaId?: number) {
    const pedido = await this.prisma.pedidoWeb.findUnique({
      where: { id },
      include: { detalles: true },
    });
    if (!pedido) throw new NotFoundException('Pedido no encontrado.');
    if (pedido.ventaId) {
      throw new BadRequestException('Este pedido ya fue convertido en venta.');
    }
    if (pedido.estado === 'ANULADO') {
      throw new BadRequestException('No se puede confirmar un pedido anulado.');
    }

    // Bodega desde donde se descuenta el stock: la indicada, o el Almacén Principal
    // (que es de donde la web ofrece stock).
    let bodega = bodegaId
      ? await this.prisma.bodega.findUnique({ where: { id: Number(bodegaId) } })
      : null;
    if (!bodega) {
      bodega = await this.prisma.bodega.findFirst({
        where: { estado: true, ...BODEGA_WEB },
      });
    }
    if (!bodega) throw new BadRequestException('No hay un Almacén Principal activo para descontar el stock.');

    const requiereEnvio = pedido.metodoEntrega === 'ENVIO';

    // Registramos la venta (CONTADO: el pago se coordinó al confirmar)
    const venta = await this.ventasService.registrarVenta({
      almacenId: bodega.id,
      tipoVenta: 'MINORISTA',
      condicionPago: 'CONTADO',
      clienteNombre: `${pedido.clienteNombre} (Web ${pedido.codigo})`,
      metodoEntrega: requiereEnvio ? 'ENVIO_AGENCIA' : 'ENTREGA_INMEDIATA',
      requiereEnvio,
      destinoEnvio: pedido.direccion || undefined,
      detalles: pedido.detalles.map((d) => ({
        productoId: d.productoId,
        color: d.color,
        talla: d.talla,
        cantidad: d.cantidad,
        precioUnitario: Number(d.precioUnitario),
      })),
    });

    // Enlazamos el pedido con la venta y lo marcamos CONFIRMADO
    await this.prisma.pedidoWeb.update({
      where: { id },
      data: { ventaId: venta.id, estado: 'CONFIRMADO' },
    });

    return {
      mensaje: 'Pedido confirmado y convertido en venta. Stock descontado.',
      pedido: pedido.codigo,
      venta: venta.correlativo,
      bodega: bodega.nombre,
    };
  }

  // ====== CUPONES / CÓDIGOS PROMOCIONALES ======

  // Valida un cupón contra un subtotal y devuelve el descuento calculado.
  // Lanza error si no aplica. Si pasa, devuelve { cupon, descuento, total }.
  async evaluarCupon(codigoRaw: string, subtotal: number) {
    const codigo = String(codigoRaw || '').trim().toUpperCase();
    if (!codigo) throw new BadRequestException('Ingresa un código.');

    const cupon = await this.prisma.cuponDescuento.findUnique({ where: { codigo } });
    if (!cupon || !cupon.activo) throw new BadRequestException('Código no válido.');
    if (cupon.vence && new Date(cupon.vence) < new Date()) {
      throw new BadRequestException('Este código ya venció.');
    }
    if (cupon.maxUsos != null && cupon.usos >= cupon.maxUsos) {
      throw new BadRequestException('Este código alcanzó su límite de usos.');
    }
    if (subtotal < Number(cupon.minCompra)) {
      throw new BadRequestException(`Este código requiere una compra mínima de S/ ${Number(cupon.minCompra).toFixed(2)}.`);
    }

    let descuento = 0;
    if (cupon.tipo === 'PORCENTAJE') {
      descuento = subtotal * (Number(cupon.valor) / 100);
    } else {
      descuento = Number(cupon.valor);
    }
    descuento = Math.min(descuento, subtotal); // nunca descontar más que el total
    descuento = Number(descuento.toFixed(2));

    return { cupon, descuento, total: Number((subtotal - descuento).toFixed(2)) };
  }

  // Endpoint público: valida un cupón sin crear pedido (para mostrar el descuento)
  async validarCupon(codigo: string, subtotal: number) {
    const r = await this.evaluarCupon(codigo, Number(subtotal) || 0);
    return {
      valido: true,
      codigo: r.cupon.codigo,
      tipo: r.cupon.tipo,
      valor: Number(r.cupon.valor),
      descuento: r.descuento,
      total: r.total,
    };
  }

  // Admin: CRUD de cupones
  listarCupones() {
    return this.prisma.cuponDescuento.findMany({ orderBy: { id: 'desc' } });
  }
  crearCupon(d: any) {
    return this.prisma.cuponDescuento.create({
      data: {
        codigo: String(d.codigo || '').trim().toUpperCase(),
        tipo: d.tipo === 'MONTO' ? 'MONTO' : 'PORCENTAJE',
        valor: Number(d.valor) || 0,
        minCompra: d.minCompra != null ? Number(d.minCompra) : 0,
        maxUsos: d.maxUsos != null && d.maxUsos !== '' ? Number(d.maxUsos) : null,
        vence: d.vence ? new Date(d.vence) : null,
        activo: d.activo ?? true,
      },
    });
  }
  actualizarCupon(id: number, d: any) {
    return this.prisma.cuponDescuento.update({
      where: { id },
      data: {
        ...(d.tipo !== undefined ? { tipo: d.tipo } : {}),
        ...(d.valor !== undefined ? { valor: Number(d.valor) } : {}),
        ...(d.minCompra !== undefined ? { minCompra: Number(d.minCompra) } : {}),
        ...(d.maxUsos !== undefined ? { maxUsos: d.maxUsos === '' || d.maxUsos == null ? null : Number(d.maxUsos) } : {}),
        ...(d.vence !== undefined ? { vence: d.vence ? new Date(d.vence) : null } : {}),
        ...(d.activo !== undefined ? { activo: d.activo } : {}),
      },
    });
  }
  async eliminarCupon(id: number) {
    await this.prisma.cuponDescuento.delete({ where: { id } });
    return { mensaje: 'Cupón eliminado' };
  }

  // ====== LIBRO DE RECLAMACIONES ======
  async crearReclamacion(d: any) {
    if (!d.nombre || !d.detalle) {
      throw new BadRequestException('Nombre y detalle del reclamo son obligatorios.');
    }
    const ultimo = await this.prisma.reclamacion.findFirst({
      orderBy: { id: 'desc' }, select: { codigo: true },
    });
    let n = 1;
    if (ultimo?.codigo) { const m = ultimo.codigo.match(/(\d+)$/); if (m) n = parseInt(m[1], 10) + 1; }
    const codigo = `HR-${String(n).padStart(5, '0')}`;

    const r = await this.prisma.reclamacion.create({
      data: {
        codigo,
        nombre: d.nombre,
        documento: d.documento ?? null,
        telefono: d.telefono ?? null,
        email: d.email ?? null,
        direccion: d.direccion ?? null,
        menorEdad: !!d.menorEdad,
        tipoBien: d.tipoBien ?? null,
        montoReclamado: d.montoReclamado ?? null,
        descripcionBien: d.descripcionBien ?? null,
        pedidoCodigo: d.pedidoCodigo ?? null,
        tipo: d.tipo === 'QUEJA' ? 'QUEJA' : 'RECLAMO',
        detalle: d.detalle,
        pedidoConsumidor: d.pedidoConsumidor ?? null,
      },
    });
    return { mensaje: 'Reclamación registrada', codigo: r.codigo };
  }

  listarReclamaciones() {
    return this.prisma.reclamacion.findMany({ orderBy: { fecha: 'desc' } });
  }

  responderReclamacion(id: number, d: any) {
    return this.prisma.reclamacion.update({
      where: { id },
      data: {
        ...(d.respuesta !== undefined ? { respuesta: d.respuesta } : {}),
        ...(d.estado !== undefined ? { estado: d.estado } : {}),
      },
    });
  }

  // ====== RESEÑAS ======
  listarResenasPublicas() {
    return this.prisma.resena.findMany({ where: { activo: true }, orderBy: { orden: 'asc' } });
  }
  listarResenasAdmin() {
    return this.prisma.resena.findMany({ orderBy: { orden: 'asc' } });
  }
  crearResena(d: any) {
    return this.prisma.resena.create({
      data: {
        nombre: d.nombre,
        texto: d.texto,
        estrellas: d.estrellas != null ? Number(d.estrellas) : 5,
        orden: d.orden != null ? Number(d.orden) : 0,
        activo: d.activo ?? true,
      },
    });
  }
  actualizarResena(id: number, d: any) {
    return this.prisma.resena.update({
      where: { id },
      data: {
        ...(d.nombre !== undefined ? { nombre: d.nombre } : {}),
        ...(d.texto !== undefined ? { texto: d.texto } : {}),
        ...(d.estrellas !== undefined ? { estrellas: Number(d.estrellas) } : {}),
        ...(d.orden !== undefined ? { orden: Number(d.orden) } : {}),
        ...(d.activo !== undefined ? { activo: d.activo } : {}),
      },
    });
  }
  async eliminarResena(id: number) {
    await this.prisma.resena.delete({ where: { id } });
    return { mensaje: 'Reseña eliminada' };
  }

  // ====== BANNER PROMOCIONAL ======
  listarBannersPublicos() {
    return this.prisma.bannerPromo.findMany({ where: { activo: true }, orderBy: { orden: 'asc' } });
  }
  listarBannersAdmin() {
    return this.prisma.bannerPromo.findMany({ orderBy: { orden: 'asc' } });
  }
  crearBanner(d: any) {
    return this.prisma.bannerPromo.create({
      data: {
        url: d.url,
        titulo: d.titulo ?? null,
        subtitulo: d.subtitulo ?? null,
        textoBoton: d.textoBoton ?? null,
        enlace: d.enlace ?? null,
        orden: d.orden != null ? Number(d.orden) : 0,
        activo: d.activo ?? true,
      },
    });
  }
  actualizarBanner(id: number, d: any) {
    return this.prisma.bannerPromo.update({
      where: { id },
      data: {
        ...(d.titulo !== undefined ? { titulo: d.titulo } : {}),
        ...(d.subtitulo !== undefined ? { subtitulo: d.subtitulo } : {}),
        ...(d.textoBoton !== undefined ? { textoBoton: d.textoBoton } : {}),
        ...(d.enlace !== undefined ? { enlace: d.enlace } : {}),
        ...(d.orden !== undefined ? { orden: Number(d.orden) } : {}),
        ...(d.activo !== undefined ? { activo: d.activo } : {}),
      },
    });
  }
  async eliminarBanner(id: number) {
    await this.prisma.bannerPromo.delete({ where: { id } });
    return { mensaje: 'Banner eliminado' };
  }

  // ====== CONFIG TIENDA (whatsapp, redes, contacto) ======
  async obtenerConfig() {
    const c = await this.prisma.configTienda.findUnique({ where: { id: 1 } });
    return c || { id: 1, whatsapp: null, instagram: null, facebook: null, email: null, direccion: null, horario: null };
  }
  async guardarConfig(d: any) {
    const datos = {
      whatsapp: d.whatsapp ?? null,
      instagram: d.instagram ?? null,
      facebook: d.facebook ?? null,
      email: d.email ?? null,
      direccion: d.direccion ?? null,
      horario: d.horario ?? null,
      yape: d.yape ?? null,
      plin: d.plin ?? null,
      cuentaBanco: d.cuentaBanco ?? null,
      titularCuenta: d.titularCuenta ?? null,
      razonSocial: d.razonSocial ?? null,
      ruc: d.ruc ?? null,
      // El logo solo se actualiza si viene (se sube por endpoint aparte)
      ...(d.logo !== undefined ? { logo: d.logo } : {}),
    };
    return this.prisma.configTienda.upsert({
      where: { id: 1 },
      update: datos,
      create: { id: 1, ...datos },
    });
  }

  // ====== PUBLICACIONES (tipo Instagram/reels) ======
  async listarPublicacionesPublicas() {
    return this.prisma.publicacion.findMany({
      where: { activo: true },
      orderBy: [{ orden: 'asc' }, { fecha: 'desc' }],
    });
  }

  async listarPublicacionesAdmin() {
    return this.prisma.publicacion.findMany({ orderBy: [{ orden: 'asc' }, { fecha: 'desc' }] });
  }

  async crearPublicacion(data: any) {
    return this.prisma.publicacion.create({
      data: {
        tipo: data.tipo || 'imagen',
        url: data.url,
        caption: data.caption ?? null,
        enlace: data.enlace ?? null,
        orden: data.orden != null ? Number(data.orden) : 0,
        activo: data.activo ?? true,
      },
    });
  }

  async actualizarPublicacion(id: number, data: any) {
    return this.prisma.publicacion.update({
      where: { id },
      data: {
        ...(data.caption !== undefined ? { caption: data.caption } : {}),
        ...(data.enlace !== undefined ? { enlace: data.enlace } : {}),
        ...(data.orden !== undefined ? { orden: Number(data.orden) } : {}),
        ...(data.activo !== undefined ? { activo: data.activo } : {}),
      },
    });
  }

  async eliminarPublicacion(id: number) {
    await this.prisma.publicacion.delete({ where: { id } });
    return { mensaje: 'Publicación eliminada' };
  }

  // ====== PORTADA / CARRUSEL ======

  // Público: solo slides activos, ordenados
  async listarPortadaPublica() {
    return this.prisma.heroSlide.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' },
    });
  }

  // Admin: todos los slides
  async listarPortadaAdmin() {
    return this.prisma.heroSlide.findMany({ orderBy: { orden: 'asc' } });
  }

  async crearSlide(data: any) {
    return this.prisma.heroSlide.create({
      data: {
        tipo: data.tipo || 'imagen',
        url: data.url,
        titulo: data.titulo ?? null,
        subtitulo: data.subtitulo ?? null,
        enlace: data.enlace ?? null,
        orden: data.orden != null ? Number(data.orden) : 0,
        activo: data.activo ?? true,
      },
    });
  }

  async actualizarSlide(id: number, data: any) {
    return this.prisma.heroSlide.update({
      where: { id },
      data: {
        ...(data.tipo !== undefined ? { tipo: data.tipo } : {}),
        ...(data.url !== undefined ? { url: data.url } : {}),
        ...(data.titulo !== undefined ? { titulo: data.titulo } : {}),
        ...(data.subtitulo !== undefined ? { subtitulo: data.subtitulo } : {}),
        ...(data.enlace !== undefined ? { enlace: data.enlace } : {}),
        ...(data.orden !== undefined ? { orden: Number(data.orden) } : {}),
        ...(data.activo !== undefined ? { activo: data.activo } : {}),
      },
    });
  }

  async eliminarSlide(id: number) {
    await this.prisma.heroSlide.delete({ where: { id } });
    return { mensaje: 'Slide eliminado' };
  }

  // Categorías disponibles (para el menú/filtros de la tienda)
  async listarCategorias() {
    const rows = await this.prisma.producto.findMany({
      where: { publicadoWeb: true, categoria: { not: null } },
      select: { categoria: true },
      distinct: ['categoria'],
      orderBy: { categoria: 'asc' },
    });
    return rows.map((r) => r.categoria).filter(Boolean);
  }

  // Detalle de un producto: precio, descripción y variantes (color/talla) con stock.
  async obtenerProducto(id: number) {
    const producto = await this.prisma.producto.findFirst({
      where: { id, publicadoWeb: true },
      select: {
        id: true,
        skuBase: true,
        nombre: true,
        categoria: true,
        descripcionWeb: true,
        imagenUrl: true,
        imagenLocal: true,
        precioWeb: true,
        imagenes: {
          select: { url: true, color: true, orden: true },
          orderBy: { orden: 'asc' },
        },
      },
    });
    if (!producto) throw new NotFoundException('Producto no disponible.');

    // Variantes con stock disponible para la web (solo Almacén Principal)
    const inventario = await this.prisma.inventarioTerminado.findMany({
      where: { productoId: id, stock: { gt: 0 }, bodega: BODEGA_WEB },
      select: { color: true, talla: true, stock: true },
    });

    // Agrupamos por color+talla (puede haber la misma variante en varias bodegas)
    const mapa = new Map<string, { color: string; talla: string; stock: number }>();
    for (const v of inventario) {
      const key = `${v.color}|${v.talla}`;
      const prev = mapa.get(key);
      if (prev) prev.stock += v.stock;
      else mapa.set(key, { color: v.color, talla: v.talla, stock: v.stock });
    }
    const variantes = [...mapa.values()];

    // Imágenes agrupadas por color. Las de color = null son "generales" (portada).
    const galeria = ((producto as any).imagenes ?? []) as { url: string; color: string | null }[];
    const generales = galeria.filter((g) => !g.color).map((g) => g.url);
    const imagenPrincipal =
      generales[0] ?? galeria[0]?.url ?? producto.imagenUrl ?? producto.imagenLocal ?? null;

    // 🔑 PROBLEMA: las variantes guardan el color como CÓDIGO (ej. "NGR") y las
    // fotos como NOMBRE (ej. "NEGRO"). Traducimos todo a un mismo valor (el de la
    // variante) usando la tabla de colores, para que la foto cambie según el color.
    const norm = (s: any) =>
      String(s ?? '').trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const todosColores = await this.prisma.color.findMany({
      select: { nombre: true, codigo: true, codigoHex: true },
    });

    const varianteColores = [...new Set(variantes.map((v) => v.color))];
    const indiceAVariante = new Map<string, string>(); // normalizado (código o nombre) -> color de variante
    const hexPorVariante = new Map<string, string | null>();
    const nombrePorVariante = new Map<string, string>();
    for (const vc of varianteColores) {
      const c = todosColores.find((x) => norm(x.codigo) === norm(vc) || norm(x.nombre) === norm(vc));
      indiceAVariante.set(norm(vc), vc);
      if (c) {
        indiceAVariante.set(norm(c.codigo), vc);
        indiceAVariante.set(norm(c.nombre), vc);
        hexPorVariante.set(vc, c.codigoHex || null);
        nombrePorVariante.set(vc, c.nombre);
      } else {
        nombrePorVariante.set(vc, vc);
      }
    }

    // Re-llaveamos las fotos al color de variante (traduce nombre <-> código)
    const imagenesPorColor: Record<string, string[]> = {};
    for (const g of galeria) {
      if (!g.color) continue;
      const clave = indiceAVariante.get(norm(g.color)) ?? g.color;
      (imagenesPorColor[clave] ??= []).push(g.url);
    }

    const nombresColores = varianteColores;
    const coloresInfo = varianteColores.map((vc) => ({
      valor: vc, // lo que se usa para seleccionar/pedir (coincide con las fotos)
      nombre: nombrePorVariante.get(vc) || vc, // nombre bonito para mostrar
      hex: hexPorVariante.get(vc) || null,
    }));

    return {
      id: producto.id,
      sku: producto.skuBase,
      nombre: producto.nombre,
      categoria: producto.categoria,
      descripcion: producto.descripcionWeb,
      imagen: imagenPrincipal,
      galeriaGeneral: generales,
      imagenesPorColor,
      precio: Number(producto.precioWeb),
      variantes,
      colores: nombresColores,
      coloresInfo,
      tallas: [...new Set(variantes.map((v) => v.talla))],
      disponible: variantes.length > 0,
    };
  }
}
