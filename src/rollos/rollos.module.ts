import { Module } from '@nestjs/common';
import { RollosService } from './rollos.service';
import { RollosController } from './rollos.controller';

@Module({
  controllers: [RollosController],
  providers: [RollosService],
  exports: [RollosService],
})
export class RollosModule {}
