import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      // El secreto sale del entorno (configúralo en Dokploy como JWT_SECRET).
      // Se deja el valor anterior como respaldo para no invalidar sesiones actuales.
      secret: process.env.JWT_SECRET || 'MODITEX_SECRET_KEY_2026',
      // Duración de la sesión. Antes eran 8h y se cerraba en jornadas largas.
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '30d') as any },
    }),
  ],
  providers: [AuthService, PrismaService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}