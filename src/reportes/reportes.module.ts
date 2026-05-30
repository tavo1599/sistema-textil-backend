import { Module } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { ReportesController } from './reportes.controller';
import { KardexModule } from '../kardex/kardex.module';

@Module({
  imports: [KardexModule],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}