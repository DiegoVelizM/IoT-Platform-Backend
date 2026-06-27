import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('IoT Platform Backend API')
    .setDescription(
      'API para recibir, almacenar y exponer telemetría de sensores médicos simulados. ' +
        'Incluye simulación automática, alertas por umbrales e integración con Kafka. ' +
        'Consulte la sección de respuestas de error en cada endpoint y el README para el catálogo completo de errores API y Kafka.',
    )
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();