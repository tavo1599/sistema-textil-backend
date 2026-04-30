import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // =========================================================
  // EL PASE LIBRE PARA TU FRONTEND (CORS)
  // =========================================================
  app.enableCors({
    origin: '*', // Por ahora dejamos que cualquier frontend entre. Luego lo cambiaremos por tu dominio real.
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

  await app.listen(3000);
}
bootstrap();