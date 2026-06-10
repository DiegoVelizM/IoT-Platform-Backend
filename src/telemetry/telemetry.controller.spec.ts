import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { TelemetryController } from './telemetry.controller';
import { SensorsService } from '../sensors/sensors.service';

describe('TelemetryController', () => {
  let controller: TelemetryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot({ ttl: 60, limit: 100 })],
      controllers: [TelemetryController],
      providers: [{ provide: SensorsService, useValue: { create: jest.fn() } }],
    }).compile();

    controller = module.get<TelemetryController>(TelemetryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
