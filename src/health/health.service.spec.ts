import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { getConnectionToken } from '@nestjs/mongoose';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: getConnectionToken(), useValue: { readyState: 1 } },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
