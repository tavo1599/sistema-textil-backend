import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    console.log('🟢 Base de datos conectada con éxito a través de Prisma');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}