import { Module } from '@nestjs/common';
import { ColoresService } from './colores.service';
import { ColoresController } from './colores.controller';

@Module({
  controllers: [ColoresController],
  providers: [ColoresService],
  exports: [ColoresService], // Lo exportamos por si otros módulos lo necesitan
})
export class ColoresModule {}