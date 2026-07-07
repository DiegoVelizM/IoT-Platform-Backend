# IoT Platform Backend

Backend de plataforma IoT construido con NestJS, MongoDB, Mongoose y Docker.

## Descripcion

El sistema recibe telemetria de sensores simulados, almacena lecturas en MongoDB, genera alertas basicas por umbrales y expone endpoints REST documentados con Swagger.

## Caracteristicas

- API REST con NestJS.
- Persistencia con MongoDB y Mongoose.
- Validacion de entrada con DTOs.
- Proteccion de endpoints sensibles con `x-api-key`.
- Paginacion en consultas de sensores y alertas.
- Indices para consultas frecuentes por `sensorId` y `createdAt`.
- Docker y Docker Compose con MongoDB autenticado.
- Swagger/OpenAPI.

## Requisitos

- Node.js 20 o compatible.
- npm.
- Docker Desktop, recomendado para levantar MongoDB y backend juntos.

## Configuracion

Copia el archivo de ejemplo y ajusta los valores:

```bash
cp .env.example .env
```

Variables principales:

```env
PORT=3000
API_KEY=replace-with-a-long-random-api-key
CORS_ORIGIN=http://localhost:3000
SWAGGER_ENABLED=true
MONGO_ROOT_USERNAME=iot_admin
MONGO_ROOT_PASSWORD=replace-with-a-long-random-password
```

El archivo `.env` no debe subirse al repositorio.

## Ejecutar con Docker

```bash
docker compose up -d --build
```

Servicios:

- Backend: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`
- MongoDB queda disponible solo dentro de la red de Docker por defecto.

Para ver el estado:

```bash
docker compose ps
```

Para ver logs:

```bash
docker logs iot_backend
```

## Ejecutar localmente sin Docker

Necesitas tener MongoDB corriendo y definir `MONGODB_URI` en tu entorno o `.env`.

```bash
npm install
npm run start:dev
```

Ejemplo de URI local sin autenticacion:

```env
MONGODB_URI=mongodb://localhost:27017/sensores_db
```

## Autenticacion

Los endpoints de sensores, telemetria, alertas, eventos y simulacion requieren el header:

```http
x-api-key: valor-de-API_KEY
```

Ejemplo:

```bash
curl -H "x-api-key: local-dev-api-key-change-me" http://localhost:3000/sensors
```

`GET /health`, `GET /` y Swagger quedan publicos para facilitar monitoreo y desarrollo.

## Endpoints principales

### Telemetria

```http
POST /telemetry
```

Body:

```json
{
  "sensorId": "ESP32-001",
  "location": "Sector A",
  "temperature": 28.5,
  "humidity": 60,
  "gasLevel": 35,
  "batteryLevel": 87,
  "latitude": -29.9533,
  "longitude": -71.3436
}
```

### Sensores

```http
GET /sensors?page=1&limit=25
GET /sensors/latest
GET /sensors/sensor/:sensorId?page=1&limit=25
```

### Alertas

```http
POST /alerts
GET /alerts?page=1&limit=25
GET /alerts/sensor/:sensorId?page=1&limit=25
```

Body:

```json
{
  "sensorId": "ESP32-001",
  "type": "gas_detected",
  "severity": "critical",
  "message": "Gas level exceeded threshold",
  "resolved": false
}
```

### Simulacion

```http
GET /simulation/sensors?quantity=5
POST /simulation/start
POST /simulation/stop
```

La simulacion esta limitada para evitar cargas accidentales: maximo 20 sensores y frecuencia minima de 5000 ms.

### Health check

```http
GET /health
```

## Comandos utiles

```bash
npm run build
npm run lint
npm test
npm run test:e2e
```

## Notas de seguridad

- Cambia `API_KEY` y `MONGO_ROOT_PASSWORD` antes de usar el proyecto fuera de desarrollo local.
- No publiques MongoDB al host salvo que sea necesario.
- Si necesitas usar MongoDB Compass, agrega temporalmente un mapeo de puerto en `docker-compose.yml` o usa un tunel controlado.
