import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SimulationController } from './simulation.controller';
import { SimulationService } from './simulation.service';

describe('SimulationController', () => {
  let controller: SimulationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SimulationController],
      providers: [
        {
          provide: SimulationService,
          useValue: {
            generateSensors: jest.fn(),
            startSimulation: jest.fn(),
            stopSimulation: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-api-key') },
        },
      ],
    }).compile();

    controller = module.get<SimulationController>(SimulationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
