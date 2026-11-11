import { Module } from '@nestjs/common';
import { TransformacionesService } from './transformaciones.service';
import { TransformacionesController } from './transformaciones.controller';
import { KardexModule } from '../kardex/kardex.module';

@Module({
  imports: [KardexModule],
  controllers: [TransformacionesController],
  providers: [TransformacionesService],
})
export class TransformacionesModule {}
