import { Test, TestingModule } from '@nestjs/testing';
import { TalleresService } from './talleres.service';

describe('TalleresService', () => {
  let service: TalleresService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TalleresService],
    }).compile();

    service = module.get<TalleresService>(TalleresService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
