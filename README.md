# IoT Platform Backend

Backend de plataforma IoT desarrollado con NestJS, MongoDB, Kafka y Docker. Orientado a la simulación, recepción, procesamiento y almacenamiento de telemetría de **sensores médicos simulados**.

## Descripción

Este proyecto corresponde al backend de una plataforma IoT para monitoreo de insumos médicos (cadena de frío) y signos vitales de pacientes. El sistema recibe lecturas de sensores simulados o reales, las persiste en MongoDB, evalúa umbrales para generar alertas automáticamente y publica eventos hacia Kafka para integración con sistemas externos.

---

## Características

- API REST con NestJS
- Documentación con Swagger/OpenAPI
- Persistencia de telemetría con MongoDB y Mongoose
- Validaciones mediante DTOs (`class-validator`)
- Simulación automática de sensores médicos
- Generación automática de alertas según umbrales configurables
- Publicación de eventos con Kafka (productor)
- Docker y Docker Compose (backend, MongoDB, Kafka, Zookeeper)
- Health check con verificación de conexión a MongoDB

---

## Tecnologías

- TypeScript
- Node.js
- NestJS
- MongoDB
- Mongoose
- Kafka (KafkaJS)
- Docker / Docker Compose
- Swagger / OpenAPI

---

## Sensores simulados

El sistema modela cuatro tipos de sensores médicos predefinidos:

| Sensor | ID | Activo | Métricas |
|--------|-----|--------|----------|
| Termómetro (cadena de frío) | `THERMO-001` | `MEDKIT-001` | temperatura (°C) |
| Glucómetro | `GLUCO-001` | `PATIENT-001` | glucosa (mg/dL) |
| Pulsioxímetro | `OXI-001` | `PATIENT-001` | SpO₂ (%), frecuencia cardíaca (bpm) |
| Esfigmomanómetro | `BP-001` | `PATIENT-001` | presión sistólica/diastólica (mmHg) |

Cada lectura incluye `sensorId`, `assetId`, `sensorType`, `batteryLevel` y `connectionStatus`.

---

## Configuración inicial

### 1. Clonar repositorio

```bash
git clone https://github.com/DiegoVelizM/IoT-Platform-Backend.git
```

### 2. Entrar al proyecto

```bash
cd IoT-Platform-Backend
```

### 3. Crear archivo `.env`

Crear un archivo `.env` en la raíz del proyecto:

```env
PORT=3000
MONGODB_URI=mongodb://mongo:27017/sensores_db
KAFKA_BROKER=kafka:9092
JWT_SECRET=super_secret_key
```

**Kafka local (Docker):** solo `KAFKA_BROKER=kafka:9092` — sin usuario ni contraseña.

**Kafka en la nube (Render + Confluent Cloud):** además del broker, configurar credenciales SASL/SSL:

```env
KAFKA_BROKER=pkc-xxxxx.us-west-2.aws.confluent.cloud:9092
KAFKA_USERNAME=tu_api_key
KAFKA_PASSWORD=tu_api_secret
KAFKA_SASL_MECHANISM=plain
```

| Proveedor | Estado | Notas |
|-----------|--------|-------|
| **Confluent Cloud** | ✅ Recomendado | Trial ~$400 / 30 días; cluster Basic; `KAFKA_SASL_MECHANISM=plain` |
| **Upstash Kafka** | ❌ Descontinuado (2024–2025) | Ya no acepta usuarios nuevos |
| **Docker local** | ✅ Para demo en clase | `KAFKA_BROKER=kafka:9092` sin credenciales |

Los topics `telemetry_received`, `alert_generated` y `sensor_offline` se crean automáticamente al arrancar si no existen.

> `JWT_SECRET` está preparado para futura autenticación; actualmente no se utiliza.

### 4. Crear volumen de MongoDB (solo Docker)

El `docker-compose.yml` usa un volumen externo. Crearlo antes del primer arranque:

```bash
docker volume create backend_sensores_mongo_data
```

---

## Ejecutar con Docker

```bash
docker compose up --build
```

El backend espera a que MongoDB, Zookeeper y Kafka estén **healthy** antes de arrancar (healthchecks en `docker-compose.yml`). El primer arranque puede tardar ~1 minuto mientras Kafka completa su boot.

Servicios levantados:

| Servicio | Contenedor | Puerto |
|----------|------------|--------|
| Backend | `iot_backend` | 3000 |
| MongoDB | `sensores_mongo` | 27017 |
| Kafka | `sensores_kafka` | 9092 |
| Zookeeper | `sensores_zookeeper` | 2181 |

---

## Swagger

Disponible en:

```txt
http://localhost:3000/docs
```

---

## Conexión a MongoDB Compass

Desde MongoDB Compass conectarse con:

```txt
mongodb://localhost:27017
```

Base de datos esperada:

```txt
sensores_db
```

Colecciones principales:

```txt
sensorreadings
alerts
```

---

## Endpoints principales

### Telemetría

```http
POST /telemetry
```

Recibe y almacena telemetría de sensores. Al procesar cada lectura, el backend publica un evento `telemetry_received` en Kafka y evalúa umbrales para generar alertas automáticas.

Ejemplo — termómetro (cadena de frío):

```json
{
  "sensorId": "THERMO-001",
  "assetId": "MEDKIT-001",
  "sensorType": "thermometer",
  "batteryLevel": 90,
  "connectionStatus": "connected",
  "temperature": 5.4
}
```

Ejemplo — pulsioxímetro:

```json
{
  "sensorId": "OXI-001",
  "assetId": "PATIENT-001",
  "sensorType": "pulse_oximeter",
  "batteryLevel": 85,
  "connectionStatus": "connected",
  "oxygenSaturation": 96,
  "heartRate": 82
}
```

Los campos `createdAt` y `updatedAt` se generan automáticamente en el backend.

---

### Sensores

```http
GET /sensors
GET /sensors/latest
GET /sensors/sensor/:sensorId
```

Permiten consultar lecturas almacenadas en MongoDB.

---

### Simulación

```http
GET  /simulation/sensors?quantity=4
POST /simulation/start
POST /simulation/stop
```

Permiten generar sensores simulados e iniciar/detener la emisión automática de lecturas periódicas.

Ejemplo — iniciar simulación con frecuencia global:

```json
{
  "frequencyMs": 5000
}
```

Ejemplo — frecuencias individuales por sensor:

```json
{
  "sensors": [
    { "sensorId": "OXI-001", "frequencyMs": 1000 },
    { "sensorId": "GLUCO-001", "frequencyMs": 3000 },
    { "sensorId": "THERMO-001", "frequencyMs": 5000 },
    { "sensorId": "BP-001", "frequencyMs": 10000 }
  ]
}
```

---

### Alertas

```http
POST /alerts
GET  /alerts
GET  /alerts/sensor/:sensorId
```

Permiten crear y consultar alertas asociadas a sensores. Al crear una alerta manualmente, se publica el evento `alert_generated` en Kafka.

Tipos de alerta generados automáticamente:

- `low_battery`
- `sensor_offline`
- `temperature_out_of_range`
- `glucose_out_of_range`
- `oxygen_saturation_low`
- `heart_rate_out_of_range`
- `blood_pressure_high`

Ejemplo de body:

```json
{
  "sensorId": "OXI-001",
  "type": "oxygen_saturation_low",
  "severity": "warning",
  "message": "Oxygen saturation below expected range",
  "resolved": false
}
```

---

### Eventos

```http
POST /events/test
```

Endpoint temporal para validar contratos de eventos. Actualmente registra el evento en consola; no publica a Kafka.

Ejemplo de body:

```json
{
  "eventId": "evt-001",
  "eventType": "telemetry_received",
  "source": "iot-platform"
}
```

---

### Health Check

```http
GET /health
```

Verifica disponibilidad del backend, MongoDB y Kafka. Ejecuta un **probe activo** contra el broker Kafka en cada consulta (no usa solo el último estado cacheado).

---

## Persistencia

La telemetría se almacena en MongoDB mediante Mongoose.

Los documentos de telemetría incluyen:

- `sensorId`
- `assetId`
- `sensorType`
- `batteryLevel`
- `connectionStatus`
- `temperature` (termómetro)
- `glucoseLevel` (glucómetro)
- `oxygenSaturation`, `heartRate` (pulsioxímetro)
- `systolicPressure`, `diastolicPressure` (esfigmomanómetro)
- `createdAt`, `updatedAt`

Las alertas se almacenan en una colección separada (`alerts`) con:

- `sensorId`
- `type`
- `severity` (`warning` | `critical`)
- `message`
- `resolved`
- `occurredAt`
- `createdAt`, `updatedAt`

---

## Arquitectura

El sistema sigue una arquitectura modular orientada a eventos.

Flujo principal:

```txt
Sensores simulados / POST /telemetry
  → Validación DTO
  → SensorsService
  → MongoDB (sensorreadings)
  → Evaluación de umbrales → AlertsService → MongoDB (alerts)
  → KafkaProducerService → topics Kafka
```

Topics Kafka publicados:

| Topic | Descripción |
|-------|-------------|
| `telemetry_received` | Nueva lectura procesada |
| `alert_generated` | Alerta creada |
| `sensor_offline` | Sensor reportado como offline |

---

## Comandos útiles

### Instalar dependencias localmente

```bash
npm install
```

### Ejecutar en desarrollo local

Requiere MongoDB (y opcionalmente Kafka) accesibles según las variables de entorno.

```bash
npm run start:dev
```

### Compilar proyecto

```bash
npm run build
```

### Ejecutar tests

```bash
npm run test
npm run test:e2e
```

### Levantar con Docker

```bash
docker compose up --build
```

### Ver logs del backend

```bash
docker logs iot_backend
```

### Entrar a MongoDB por consola

```bash
docker exec -it sensores_mongo mongosh
```

Dentro de MongoDB:

```js
use sensores_db
show collections
db.sensorreadings.find().pretty()
db.alerts.find().pretty()
```

---

## Documentación de errores API

Todos los endpoints REST devuelven errores con el siguiente **formato estandarizado**:

```json
{
  "statusCode": 400,
  "error": "VALIDATION_ERROR",
  "message": ["sensorId must be a string"],
  "timestamp": "2026-06-27T12:00:00.000Z",
  "path": "/telemetry"
}
```

### Códigos de error (`error`)

| Código | HTTP | Descripción |
|--------|------|-------------|
| `VALIDATION_ERROR` | 400 | Body o parámetros inválidos |
| `NOT_FOUND` | 404 | Recurso no encontrado |
| `INTERNAL_ERROR` | 500 | Error interno no controlado |
| `KAFKA_CONNECTION_FAILED` | — | Kafka no disponible (en `warnings` o `/health`) |
| `KAFKA_PUBLISH_FAILED` | — | Fallo al publicar evento (en `warnings` o `/health`) |

### Códigos HTTP

| Código | Cuándo ocurre | Endpoints afectados |
|--------|---------------|---------------------|
| `400 Bad Request` | Body inválido: campos requeridos ausentes, tipos incorrectos, valores fuera de rango (`@Min`/`@Max`), enums inválidos o propiedades no permitidas (`forbidNonWhitelisted`) | `POST /telemetry`, `POST /alerts`, `POST /simulation/start`, `POST /events/test` |
| `404 Not Found` | No existen lecturas o alertas para el identificador consultado | `GET /sensors/latest`, `GET /sensors/sensor/:sensorId`, `GET /alerts/sensor/:sensorId` |
| `500 Internal Server Error` | MongoDB no disponible, error al persistir o excepción no controlada | Endpoints que leen/escriben en base de datos |

### Ejemplos por endpoint

**POST /telemetry — campo requerido ausente:**

```json
{
  "statusCode": 400,
  "error": "VALIDATION_ERROR",
  "message": [
    "sensorId must be a string",
    "assetId must be a string",
    "sensorType must be one of the following values: thermometer, glucometer, pulse_oximeter, sphygmomanometer"
  ],
  "timestamp": "2026-06-27T12:00:00.000Z",
  "path": "/telemetry"
}
```

**GET /sensors/sensor/UNKNOWN-001 — sin lecturas:**

```json
{
  "statusCode": 404,
  "error": "NOT_FOUND",
  "message": "Sensor readings not found for identifier \"UNKNOWN-001\"",
  "timestamp": "2026-06-27T12:00:00.000Z",
  "path": "/sensors/sensor/UNKNOWN-001"
}
```

**GET /health — MongoDB o Kafka desconectados:**

Responde `200 OK` con `status: "degraded"`. Kafka se verifica en tiempo real con un probe activo (`listTopics`); si el broker está disponible, reconecta el productor automáticamente:

```json
{
  "status": "degraded",
  "service": "iot-platform-backend",
  "database": "connected",
  "kafka": {
    "connected": false,
    "broker": "kafka:9092",
    "lastError": "Connection error",
    "lastErrorCode": "KAFKA_CONNECTION_FAILED"
  },
  "timestamp": "2026-06-27T12:00:00.000Z"
}
```

**POST /telemetry — Kafka caído (telemetría guardada):**

Responde `201` con warnings opcionales:

```json
{
  "sensorId": "OXI-001",
  "assetId": "PATIENT-001",
  "warnings": [
    {
      "code": "KAFKA_PUBLISH_FAILED",
      "message": "Failed to publish event to topic telemetry_received",
      "topic": "telemetry_received"
    }
  ]
}
```

> La documentación interactiva de respuestas de error por endpoint está disponible en Swagger: `http://localhost:3000/docs`

---

## Documentación de errores Kafka

El productor Kafka (`KafkaProducerService`) opera de forma **no bloqueante** respecto a la API REST: un fallo de Kafka **no impide** que la telemetría o las alertas se guarden en MongoDB. Los fallos se reportan mediante códigos estandarizados (`KAFKA_CONNECTION_FAILED`, `KAFKA_PUBLISH_FAILED`) en el array `warnings` de las respuestas de escritura y en el endpoint `/health`.

### Escenarios de error

| Escenario | Comportamiento de la API | Log del servidor |
|-----------|--------------------------|------------------|
| Broker no disponible al iniciar | La app arranca igualmente; Kafka queda desconectado | `Kafka connect error` |
| Fallo al publicar evento | La operación HTTP termina con éxito (201/200) y `warnings` en el body | `Failed to send message to topic <topic>` |
| Productor desconectado al emitir | Intenta reconectar automáticamente antes de enviar | `Kafka producer disconnected. Reconnecting...` |
| Reconexión exitosa | El evento se publica normalmente | `Message sent to topic <topic>` |
| Reconexión fallida | La operación HTTP sigue siendo exitosa; el evento no se publica | `Failed to send message to topic <topic>` |

### Topics afectados

| Topic | Origen | Impacto si falla la publicación |
|-------|--------|----------------------------------|
| `telemetry_received` | `SensorsService` tras guardar lectura | Dato en MongoDB; consumidores externos no reciben el evento |
| `alert_generated` | `AlertsService` tras crear alerta | Alerta en MongoDB; consumidores externos no notificados |
| `sensor_offline` | `SensorsService` al detectar sensor offline | Alerta creada; evento offline no distribuido |

### Cómo diagnosticar

```bash
docker logs iot_backend 2>&1 | findstr /i "kafka"
```

En Linux/macOS:

```bash
docker logs iot_backend 2>&1 | grep -i kafka
```

Mensajes clave:

- `Connected to Kafka broker kafka:9092` — conexión OK al arrancar
- `Kafka connect error` — broker inaccesible al iniciar
- `Failed to send message to topic` — publicación fallida (datos ya persistidos en MongoDB)

### Variable de entorno

```env
KAFKA_BROKER=kafka:9092
```

Si el broker es incorrecto o inalcanzable, la API sigue operativa pero los eventos no se distribuyen hasta que Kafka esté disponible.

---

## Estado del proyecto

Proyecto académico en desarrollo activo.

**Implementado:**

- Ingestión de telemetría médica (`POST /telemetry`)
- Simulación automática de sensores (`/simulation/*`)
- Persistencia en MongoDB
- Generación automática de alertas por umbrales
- Productor Kafka con publicación de eventos
- Estandarización de errores HTTP 400/404/500 con `HttpExceptionFilter`
- Manejo estructurado de errores Kafka con `warnings` en respuestas y estado en `/health`
- Documentación Swagger con respuestas de error por endpoint
- Catálogo de errores API y Kafka en README
- Contenerización con Docker Compose

**Pendiente / en progreso:**

- Consumidores Kafka
- Autenticación JWT (dependencias instaladas, módulo no implementado)
- Deduplicación y resolución de alertas activas
- Integración del endpoint `/events/test` con Kafka

---
