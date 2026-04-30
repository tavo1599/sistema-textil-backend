import { Test, TestingModule } from '@nestjs/testing';
import { TalleresController } from './talleres.controller';
import { TalleresService } from './talleres.service';

describe('TalleresController', () => {
  let controller: TalleresController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TalleresController],
      providers: [TalleresService],
    }).compile();

    controller = module.get<TalleresController>(TalleresController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
