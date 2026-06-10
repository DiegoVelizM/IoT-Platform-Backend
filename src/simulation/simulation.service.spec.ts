import { Test, TestingModule } from '@nestjs/testing';
import { SimulationService } from './simulation.service';
import { SensorsService } from '../sensors/sensors.service';
import { KafkaProducerService } from '../kafka/kafka-producer.service';

describe('SimulationService', () => {
  let service: SimulationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimulationService,
        { provide: SensorsService, useValue: {} },
        { provide: KafkaProducerService, useValue: {} },
      ],
    }).compile();

    service = module.get<SimulationService>(SimulationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
