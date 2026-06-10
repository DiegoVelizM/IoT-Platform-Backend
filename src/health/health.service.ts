import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class HealthService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  getHealth() {
    const database =
      this.connection.readyState === 1 ? 'connected' : 'disconnected';

    return {
      status: 'ok',
      service: 'iot-platform-backend',
      database,
      timestamp: new Date().toISOString(),
    };
  }
}
