import { Global, Module } from '@nestjs/common';
import { MediaService } from './media.service';

// Global para que cualquier controlador pueda inyectar MediaService sin reimportar.
@Global()
@Module({
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
