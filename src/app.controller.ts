import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import * as bcrypt from 'bcrypt';
import { PrismaService } from './prisma/prisma.service'; // Asegúrate de que la ruta a tu PrismaService sea correcta

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService // Inyectamos Prisma aquí
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Healthcheck para Docker/Dokploy (Traefik enruta solo si el contenedor está "healthy")
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  // 👇 NUESTRA RUTA MÁGICA PARA CREAR EL ADMIN 👇
  @Get('crear-admin')
  async crearAdmin() {
    const passwordHashed = await bcrypt.hash('admin123', 10);
    
    await this.prisma.usuario.upsert({
      where: { email: 'admin@moditex.com' },
      update: {},
      create: {
        email: 'admin@moditex.com',
        nombre: 'Admin Moditex',
        password: passwordHashed,
        rol: 'ADMIN', 
      },
    });
    
    return "¡Usuario ADMIN creado con éxito! Ya puedes iniciar sesión en Vue.";
  }
}