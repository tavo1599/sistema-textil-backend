import { Test, TestingModule } from '@nestjs/testing';
import { GuiasController } from './guias.controller';
import { GuiasService } from './guias.service';

describe('GuiasController', () => {
  let controller: GuiasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuiasController],
      providers: [GuiasService],
    }).compile();

    controller = module.get<GuiasController>(GuiasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
