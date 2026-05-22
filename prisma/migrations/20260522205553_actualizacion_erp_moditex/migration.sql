-- CreateTable
CREATE TABLE "Almacen" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,

    CONSTRAINT "Almacen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Color" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL DEFAULT 'XXX',
    "codigoHex" TEXT,

    CONSTRAINT "Color_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Talla" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Talla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" SERIAL NOT NULL,
    "skuBase" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT,
    "imagenLocal" TEXT,
    "publicadoWeb" BOOLEAN NOT NULL DEFAULT false,
    "descripcionWeb" TEXT,
    "imagenUrl" TEXT,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insumo" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "unidadMedida" TEXT NOT NULL,
    "costoUnitario" DECIMAL(65,30) NOT NULL DEFAULT 0.0000,
    "stockActual" DECIMAL(65,30) NOT NULL DEFAULT 0.00,

    CONSTRAINT "Insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProveedorTaller" (
    "id" SERIAL NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "telefono" TEXT,

    CONSTRAINT "ProveedorTaller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductoBom" (
    "id" SERIAL NOT NULL,
    "cantidadRequerida" DECIMAL(65,30) NOT NULL,
    "mermaEstimadaPct" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "productoId" INTEGER NOT NULL,
    "insumoId" INTEGER NOT NULL,

    CONSTRAINT "ProductoBom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdenProduccion" (
    "id" SERIAL NOT NULL,
    "codigoOp" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'Pendiente',
    "productoId" INTEGER NOT NULL,

    CONSTRAINT "OrdenProduccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdenDetalleMatriz" (
    "id" SERIAL NOT NULL,
    "cantidadProgramada" INTEGER NOT NULL,
    "cantidadEtiquetada1" INTEGER NOT NULL DEFAULT 0,
    "cantidadEtiquetada2" INTEGER NOT NULL DEFAULT 0,
    "ordenId" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'N/A',
    "talla" TEXT NOT NULL DEFAULT 'N/A',

    CONSTRAINT "OrdenDetalleMatriz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdenRutaServicio" (
    "id" SERIAL NOT NULL,
    "tipoServicio" TEXT NOT NULL,
    "ordenSecuencia" INTEGER NOT NULL,
    "costoUnitarioPactado" DECIMAL(65,30) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Pendiente',
    "ordenId" INTEGER NOT NULL,
    "tallerId" INTEGER NOT NULL,

    CONSTRAINT "OrdenRutaServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductoRuta" (
    "id" SERIAL NOT NULL,
    "tipoServicio" TEXT NOT NULL,
    "ordenSecuencia" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,

    CONSTRAINT "ProductoRuta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuiaServicio" (
    "id" SERIAL NOT NULL,
    "correlativo" TEXT NOT NULL,
    "tipoGuia" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'En Transito',
    "ordenId" INTEGER NOT NULL,
    "tallerId" INTEGER NOT NULL,

    CONSTRAINT "GuiaServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuiaDetalle" (
    "id" SERIAL NOT NULL,
    "cantidadEnviada" INTEGER NOT NULL DEFAULT 0,
    "cantidadRecibida" INTEGER NOT NULL DEFAULT 0,
    "cantidadFalla" INTEGER NOT NULL DEFAULT 0,
    "guiaId" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'N/A',
    "talla" TEXT NOT NULL DEFAULT 'N/A',

    CONSTRAINT "GuiaDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoIncidencia" (
    "id" SERIAL NOT NULL,
    "correlativo" TEXT NOT NULL,
    "tipoFalla" TEXT NOT NULL,
    "cantidadAfectada" INTEGER NOT NULL,
    "costoTotalPerdida" DECIMAL(65,30) NOT NULL,
    "responsablePago" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Pendiente Descuento',
    "ordenId" INTEGER NOT NULL,
    "tallerId" INTEGER NOT NULL,

    CONSTRAINT "MemoIncidencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockPrenda" (
    "id" SERIAL NOT NULL,
    "skuBarras" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 0,
    "productoId" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'N/A',
    "talla" TEXT NOT NULL DEFAULT 'N/A',
    "almacenId" INTEGER NOT NULL,

    CONSTRAINT "StockPrenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdenCosteoFinal" (
    "id" SERIAL NOT NULL,
    "loteProducidoReal" INTEGER NOT NULL,
    "costoTotalUnitarioNeto" DECIMAL(65,30) NOT NULL,
    "margenMayorista" DECIMAL(65,30) NOT NULL DEFAULT 0.35,
    "precioMayorista" DECIMAL(65,30) NOT NULL,
    "margenMinorista" DECIMAL(65,30) NOT NULL DEFAULT 0.70,
    "precioMinorista" DECIMAL(65,30) NOT NULL,
    "ordenId" INTEGER NOT NULL,

    CONSTRAINT "OrdenCosteoFinal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'USER',

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" SERIAL NOT NULL,
    "accion" TEXT NOT NULL,
    "tabla" TEXT NOT NULL,
    "registroId" INTEGER NOT NULL,
    "detalles" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" INTEGER NOT NULL,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdenGastoCif" (
    "id" SERIAL NOT NULL,
    "concepto" TEXT NOT NULL,
    "costoTotal" DECIMAL(65,30) NOT NULL,
    "ordenId" INTEGER NOT NULL,

    CONSTRAINT "OrdenGastoCif_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bodega" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "direccion" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Bodega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventarioTerminado" (
    "id" SERIAL NOT NULL,
    "productoId" INTEGER NOT NULL,
    "bodegaId" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "talla" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InventarioTerminado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DespachoVenta" (
    "id" SERIAL NOT NULL,
    "codigoGuia" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "prendas" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Listo para Empaque',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ventaId" INTEGER,

    CONSTRAINT "DespachoVenta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venta" (
    "id" SERIAL NOT NULL,
    "correlativo" TEXT NOT NULL,
    "clienteId" INTEGER,
    "clienteNombre" TEXT NOT NULL DEFAULT 'Público General',
    "tipoVenta" TEXT NOT NULL,
    "condicionPago" TEXT NOT NULL DEFAULT 'CONTADO',
    "estadoPago" TEXT NOT NULL DEFAULT 'PAGADO',
    "metodoEntrega" TEXT NOT NULL,
    "destinoEnvio" TEXT,
    "totalVenta" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "totalPagado" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "estado" TEXT NOT NULL DEFAULT 'Completada',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bodegaId" INTEGER NOT NULL,

    CONSTRAINT "Venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentaDetalle" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "talla" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "VentaDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuotaCredito" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "numeroCuota" INTEGER NOT NULL,
    "montoEsperado" DECIMAL(10,2) NOT NULL,
    "montoPagado" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "fechaVencimiento" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "CuotaCredito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Abono" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "cuotaId" INTEGER,
    "monto" DECIMAL(10,2) NOT NULL,
    "metodoPago" TEXT NOT NULL,
    "referencia" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anotacion" TEXT,

    CONSTRAINT "Abono_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" SERIAL NOT NULL,
    "documento" TEXT,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "direccion" TEXT,
    "limiteCredito" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "saldoPendiente" DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoInventario" (
    "id" SERIAL NOT NULL,
    "tipoMovimiento" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenciaId" INTEGER,
    "productoId" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "talla" TEXT NOT NULL,
    "bodegaId" INTEGER NOT NULL,

    CONSTRAINT "MovimientoInventario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Color_nombre_key" ON "Color"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Color_codigo_key" ON "Color"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_skuBase_key" ON "Producto"("skuBase");

-- CreateIndex
CREATE UNIQUE INDEX "Insumo_codigo_key" ON "Insumo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "OrdenProduccion_codigoOp_key" ON "OrdenProduccion"("codigoOp");

-- CreateIndex
CREATE UNIQUE INDEX "GuiaServicio_correlativo_key" ON "GuiaServicio"("correlativo");

-- CreateIndex
CREATE UNIQUE INDEX "MemoIncidencia_correlativo_key" ON "MemoIncidencia"("correlativo");

-- CreateIndex
CREATE UNIQUE INDEX "StockPrenda_skuBarras_key" ON "StockPrenda"("skuBarras");

-- CreateIndex
CREATE UNIQUE INDEX "OrdenCosteoFinal_ordenId_key" ON "OrdenCosteoFinal"("ordenId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "InventarioTerminado_productoId_bodegaId_color_talla_key" ON "InventarioTerminado"("productoId", "bodegaId", "color", "talla");

-- CreateIndex
CREATE UNIQUE INDEX "DespachoVenta_codigoGuia_key" ON "DespachoVenta"("codigoGuia");

-- CreateIndex
CREATE UNIQUE INDEX "DespachoVenta_ventaId_key" ON "DespachoVenta"("ventaId");

-- CreateIndex
CREATE UNIQUE INDEX "Venta_correlativo_key" ON "Venta"("correlativo");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_documento_key" ON "Cliente"("documento");

-- AddForeignKey
ALTER TABLE "ProductoBom" ADD CONSTRAINT "ProductoBom_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoBom" ADD CONSTRAINT "ProductoBom_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenProduccion" ADD CONSTRAINT "OrdenProduccion_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenDetalleMatriz" ADD CONSTRAINT "OrdenDetalleMatriz_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "OrdenProduccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenRutaServicio" ADD CONSTRAINT "OrdenRutaServicio_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "OrdenProduccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenRutaServicio" ADD CONSTRAINT "OrdenRutaServicio_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "ProveedorTaller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoRuta" ADD CONSTRAINT "ProductoRuta_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuiaServicio" ADD CONSTRAINT "GuiaServicio_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "OrdenProduccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuiaServicio" ADD CONSTRAINT "GuiaServicio_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "ProveedorTaller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuiaDetalle" ADD CONSTRAINT "GuiaDetalle_guiaId_fkey" FOREIGN KEY ("guiaId") REFERENCES "GuiaServicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoIncidencia" ADD CONSTRAINT "MemoIncidencia_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "OrdenProduccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoIncidencia" ADD CONSTRAINT "MemoIncidencia_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "ProveedorTaller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockPrenda" ADD CONSTRAINT "StockPrenda_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockPrenda" ADD CONSTRAINT "StockPrenda_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "Almacen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCosteoFinal" ADD CONSTRAINT "OrdenCosteoFinal_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "OrdenProduccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenGastoCif" ADD CONSTRAINT "OrdenGastoCif_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "OrdenProduccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventarioTerminado" ADD CONSTRAINT "InventarioTerminado_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventarioTerminado" ADD CONSTRAINT "InventarioTerminado_bodegaId_fkey" FOREIGN KEY ("bodegaId") REFERENCES "Bodega"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DespachoVenta" ADD CONSTRAINT "DespachoVenta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_bodegaId_fkey" FOREIGN KEY ("bodegaId") REFERENCES "Bodega"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaDetalle" ADD CONSTRAINT "VentaDetalle_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaDetalle" ADD CONSTRAINT "VentaDetalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuotaCredito" ADD CONSTRAINT "CuotaCredito_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abono" ADD CONSTRAINT "Abono_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abono" ADD CONSTRAINT "Abono_cuotaId_fkey" FOREIGN KEY ("cuotaId") REFERENCES "CuotaCredito"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_bodegaId_fkey" FOREIGN KEY ("bodegaId") REFERENCES "Bodega"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
