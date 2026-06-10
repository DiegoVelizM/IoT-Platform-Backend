import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { SensorsModule } from '../sensors/sensors.module';

@Module({
  imports: [SensorsModule],
  controllers: [AssetsController],
})
export class AssetsModule {}
