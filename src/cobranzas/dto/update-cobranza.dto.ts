import { PartialType } from '@nestjs/swagger';
import { CreateCobranzaDto } from './create-cobranza.dto';

export class UpdateCobranzaDto extends PartialType(CreateCobranzaDto) {}
