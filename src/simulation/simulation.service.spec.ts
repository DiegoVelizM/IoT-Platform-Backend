import { Test, TestingModule } from '@nestjs/testing';
import { SimulationService } from './simulation.service';
import { SensorsService } from '../sensors/sensors.service';

describe('SimulationService', () => {
  let service: SimulationService;
  let sensorsService: { create: jest.Mock };

  beforeEach(async () => {
    sensorsService = { create: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimulationService,
        { provide: SensorsService, useValue: sensorsService },
      ],
    }).compile();

    service = module.get<SimulationService>(SimulationService);
  });

  afterEach(() => {
    service.stopSimulation();
  });

  it('generates unique medical sensor ids rotating types', () => {
    const sensors = service.generateSensors(4);

    expect(sensors).toHaveLength(4);
    expect(sensors.map((sensor) => sensor.sensorId)).toEqual([
      'THERMO-001',
      'GLUCO-001',
      'OXI-001',
      'BP-001',
    ]);
  });

  it('clamps quantity to maximum supported manual count', () => {
    const sensors = service.generateSensors(5000);

    expect(sensors).toHaveLength(1000);
  });

  it('returns already running message when simulation is active', () => {
    const first = service.startSimulation({ quantity: 1, frequencyMs: 60_000 });
    const second = service.startSimulation({ quantity: 1, frequencyMs: 60_000 });

    expect(first.message).toContain('iniciada');
    expect(second).toEqual({ message: 'La simulación ya está en ejecución' });
  });

  it('stops scheduled simulation without error', () => {
    service.startSimulation({ quantity: 1, frequencyMs: 60_000 });

    expect(service.stopSimulation()).toEqual({
      message: 'Simulación detenida correctamente',
    });
  });
});
