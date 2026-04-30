import { Module } from '@nestjs/common';
import { TalleresService } from './talleres.service';
import { TalleresController } from './talleres.controller';

@Module({
  controllers: [TalleresController],
  providers: [TalleresService],
})
export class TalleresModule {}
