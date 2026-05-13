import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // =========================================================
  // EL PASE LIBRE PARA TU FRONTEND (CORS)
  // =========================================================
  app.enableCors({
    // En producción, es mejor poner la URL de Vercel aquí. 
    // Pero 'true' funcionará para que no te bloquee al inicio.
    origin: true, 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // --- Configuración de Swagger ---
  const config = new DocumentBuilder()
    .setTitle('API MODITEX')
    .setDescription('El motor del sistema ERP Textil')
    .setVersion('1.0')
    .addBearerAuth() 
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // =========================================================
  // 🚀 AJUSTE PARA RAILWAY: PUERTO DINÁMICO
  // =========================================================
  // process.env.PORT es la variable que Railway llena automáticamente.
  const port = process.env.PORT || 3000;
  
  // Escuchamos en el puerto asignado y en '0.0.0.0' para aceptar tráfico externo
  await app.listen(port, '0.0.0.0');
  
  console.log(`✅ Moditex API lista en el puerto: ${port}`);
}
bootstrap();