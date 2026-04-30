import { Controller, Get, Post, Body } from '@nestjs/common';
import { TalleresService } from './talleres.service';
import { CreateTallereDto } from './dto/create-tallere.dto';

@Controller('talleres')
export class TalleresController {
  constructor(private readonly talleresService: TalleresService) {}

  @Post()
  create(@Body() createTallereDto: CreateTallereDto) {
    return this.talleresService.create(createTallereDto);
  }

  @Get()
  findAll() {
    return this.talleresService.findAll();
  }
}