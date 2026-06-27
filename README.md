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

Verifica disponibilidad del backend y el estado de la conexión a MongoDB.

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

## Estado del proyecto

Proyecto académico en desarrollo activo.

**Implementado:**

- Ingestión de telemetría médica (`POST /telemetry`)
- Simulación automática de sensores (`/simulation/*`)
- Persistencia en MongoDB
- Generación automática de alertas por umbrales
- Productor Kafka con publicación de eventos
- Documentación Swagger
- Contenerización con Docker Compose

**Pendiente / en progreso:**

- Consumidores Kafka
- Autenticación JWT (dependencias instaladas, módulo no implementado)
- Deduplicación y resolución de alertas activas
- Health check de Kafka
- Integración del endpoint `/events/test` con Kafka

---
