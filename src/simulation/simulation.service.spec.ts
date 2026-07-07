import { Test, TestingModule } from '@nestjs/testing';
import { SensorsService } from '../sensors/sensors.service';
import { SimulationService } from './simulation.service';

describe('SimulationService', () => {
  let service: SimulationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimulationService,
        {
          provide: SensorsService,
          useValue: { create: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<SimulationService>(SimulationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
