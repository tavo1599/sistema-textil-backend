import { Module } from '@nestjs/common';
import { OrdenesService } from './ordenes.service';
import { OrdenesController } from './ordenes.controller';
import { KardexModule } from '../kardex/kardex.module';

@Module({
  imports: [KardexModule],
  controllers: [OrdenesController],
  providers: [OrdenesService],
})
export class OrdenesModule {}