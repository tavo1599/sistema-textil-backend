import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductosModule } from './productos/productos.module';
import { PrismaModule } from './prisma/prisma.module';
import { InsumosModule } from './insumos/insumos.module';
import { FichaTecnicaModule } from './ficha-tecnica/ficha-tecnica.module';
import { OrdenesModule } from './ordenes/ordenes.module';
import { TalleresModule } from './talleres/talleres.module';
import { GuiasModule } from './guias/guias.module';
import { LiquidacionesModule } from './liquidaciones/liquidaciones.module';
import { StockModule } from './stock/stock.module';
import { VentasModule } from './ventas/ventas.module';
import { ReportesModule } from './reportes/reportes.module';
import { AuthModule } from './auth/auth.module';
import { ScannerGateway } from './scanner/scanner.gateway';

// 1. Importamos las herramientas para ver archivos
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

// 2. Importamos tu nuevo controlador
import { ArchivosController } from './archivos/archivos.controller';
import { AlmacenTerminadosModule } from './almacen-terminados/almacen-terminados.module';
import { ColoresModule } from './colores/colores.module';
import { DespachosModule } from './despachos/despachos.module';
import { ClientesModule } from './clientes/clientes.module';
import { CobranzasModule } from './cobranzas/cobranzas.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ComprasModule } from './compras/compras.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { TiendaModule } from './tienda/tienda.module';
import { MediaModule } from './media/media.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ProductosModule, 
    PrismaModule, 
    InsumosModule, 
    FichaTecnicaModule, 
    OrdenesModule, 
    TalleresModule, 
    GuiasModule, 
    LiquidacionesModule, 
    StockModule, 
    VentasModule, 
    ReportesModule, 
    AuthModule,
    ColoresModule,
    // 3. Configuramos la carpeta "uploads" para que sea pública
    // Usamos process.cwd() (raíz del proyecto) porque ahí guarda multer ('./uploads')
    // y porque main.js compila en dist/src, lo que rompía el join con __dirname.
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    AlmacenTerminadosModule,
    DespachosModule,
    ClientesModule,
    CobranzasModule,
    DashboardModule,
    ComprasModule,
    UsuariosModule,
    TiendaModule,
    MediaModule,
    EmailModule,
  ],
  // 4. Registramos el controlador para que Swagger lo detecte
  controllers: [AppController, ArchivosController],
  providers: [AppService, ScannerGateway,],
})
export class AppModule {}