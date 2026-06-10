import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('TelemetryController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should accept a valid temperature telemetry payload', async () => {
    const payload = {
      sensor_id: 'TEST-SENSOR-001',
      asset_id: 'PATIENT-TEST-001',
      sensor_type: 'temperature',
      temperature: 37.3,
      battery: 80,
      signal_strength: 90,
    };

    await request(app.getHttpServer())
      .post('/telemetry')
      .send(payload)
      .expect(201);
  });

  it('should reject an invalid telemetry payload', async () => {
    const payload = {
      asset_id: 'PATIENT-TEST-002',
      sensor_type: 'temperature',
      temperature: 24,
    };

    await request(app.getHttpServer())
      .post('/telemetry')
      .send(payload)
      .expect(400);
  });
});
