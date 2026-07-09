import { Test, TestingModule } from '@nestjs/testing';
import { DemoTelemetryController } from './demo-telemetry.controller';
import { DemoTelemetryService } from './demo-telemetry.service';

describe('DemoTelemetryController', () => {
  let controller: DemoTelemetryController;
  let demoTelemetryService: {
    listScenarios: jest.Mock;
    runScenario: jest.Mock;
    submitCustomTelemetry: jest.Mock;
  };

  beforeEach(async () => {
    demoTelemetryService = {
      listScenarios: jest.fn().mockReturnValue([]),
      runScenario: jest.fn().mockResolvedValue({ scenarioId: 'low-battery-warning' }),
      submitCustomTelemetry: jest.fn().mockResolvedValue({ scenarioTitle: 'custom' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoTelemetryController],
      providers: [
        { provide: DemoTelemetryService, useValue: demoTelemetryService },
      ],
    }).compile();

    controller = module.get<DemoTelemetryController>(DemoTelemetryController);
  });

  it('lists scenarios', () => {
    controller.listScenarios();

    expect(demoTelemetryService.listScenarios).toHaveBeenCalled();
  });

  it('runs scenario by id', async () => {
    await controller.runScenario('low-battery-warning', { sensorId: 'OXI-DEMO-001' });

    expect(demoTelemetryService.runScenario).toHaveBeenCalledWith(
      'low-battery-warning',
      { sensorId: 'OXI-DEMO-001' },
    );
  });
});
