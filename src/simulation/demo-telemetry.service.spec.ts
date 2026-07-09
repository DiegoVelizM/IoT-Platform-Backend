import { Test, TestingModule } from '@nestjs/testing';
import { ResourceNotFoundException } from '../common/exceptions/resource-not-found.exception';
import { SensorsService } from '../sensors/sensors.service';
import { MedicalSensorType } from '../sensors/dto/create-sensor-reading.dto';
import { DemoTelemetryService } from './demo-telemetry.service';
import { DEMO_SCENARIOS } from './demo-scenarios';

describe('DemoTelemetryService', () => {
  let service: DemoTelemetryService;
  let sensorsService: { create: jest.Mock };

  beforeEach(async () => {
    sensorsService = {
      create: jest.fn().mockResolvedValue({
        _id: 'reading-id',
        sensorId: 'OXI-001',
        assetId: 'PATIENT-001',
        sensorType: MedicalSensorType.PULSE_OXIMETER,
        batteryLevel: 15,
        createdAt: '2026-07-09T00:00:00.000Z',
        updatedAt: '2026-07-09T00:00:00.000Z',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DemoTelemetryService,
        { provide: SensorsService, useValue: sensorsService },
      ],
    }).compile();

    service = module.get<DemoTelemetryService>(DemoTelemetryService);
  });

  it('lists predefined demo scenarios', () => {
    expect(service.listScenarios()).toEqual(DEMO_SCENARIOS);
  });

  it('runs a known scenario through sensors service', async () => {
    const result = await service.runScenario('low-battery-warning');

    expect(sensorsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sensorId: 'OXI-001',
        batteryLevel: 15,
      }),
    );
    expect(result.scenarioId).toBe('low-battery-warning');
    expect(result.expectedEffects.type).toBe('low_battery');
    expect(result.integrations.p11).toContain('alert_generated');
  });

  it('allows overriding sensorId when running a scenario', async () => {
    await service.runScenario('oxygen-low', { sensorId: 'OXI-DEMO-99' });

    expect(sensorsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sensorId: 'OXI-DEMO-99',
        oxygenSaturation: 89,
      }),
    );
  });

  it('throws when scenario id does not exist', async () => {
    await expect(service.runScenario('unknown-scenario')).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
  });
});
