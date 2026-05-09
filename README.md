# IoT Platform Backend

Backend de plataforma IoT desarrollado con NestJS, MongoDB, Mongoose y Docker.

## Descripción

Este proyecto corresponde al backend de una plataforma IoT orientada a la simulación, recepción, procesamiento y almacenamiento de telemetría de sensores.

El sistema permite recibir datos de sensores simulados, almacenarlos en MongoDB y definir estructuras iniciales para eventos y alertas. La arquitectura está preparada para futuras integraciones con Kafka y sistemas externos consumidores.

---

## Características

- API REST con NestJS
- Documentación con Swagger/OpenAPI
- Persistencia de telemetría con MongoDB
- Modelado de datos con Mongoose
- Validaciones mediante DTOs
- Docker y Docker Compose
- Endpoint de telemetría
- Consulta de sensores
- Esquema y endpoints de alertas
- Endpoint temporal para prueba de eventos
- Preparación para arquitectura orientada a eventos

---

## Tecnologías

- TypeScript
- Node.js
- NestJS
- MongoDB
- Mongoose
- Docker
- Swagger / OpenAPI

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
JWT_SECRET=super_secret_key
```

---

## Ejecutar con Docker

```bash
docker compose up --build
```

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

Recibe y almacena telemetría de sensores simulados.

Ejemplo de body:

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

El campo `timestamp` se genera automáticamente en el backend.

---

### Sensores

```http
GET /sensors
GET /sensors/latest
GET /sensors/sensor/:sensorId
```

Permiten consultar lecturas almacenadas en MongoDB.

---

### Alertas

```http
POST /alerts
GET /alerts
```

Permiten crear y consultar alertas asociadas a sensores.

Ejemplo de body:

```json
{
  "sensorId": "ESP32-001",
  "type": "gas_detected",
  "severity": "critical",
  "message": "Gas level exceeded threshold",
  "resolved": false
}
```

---

### Eventos

```http
POST /events/test
```

Endpoint temporal para validar contratos de eventos antes de la integración con Kafka.

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

Verifica disponibilidad del backend.

---

## Persistencia

La telemetría se almacena en MongoDB mediante Mongoose.

Los documentos de telemetría incluyen:

- sensorId
- location
- temperature
- humidity
- gasLevel
- batteryLevel
- latitude
- longitude
- timestamp automático
- createdAt
- updatedAt

Las alertas se almacenan en una colección separada para mantener separada la telemetría de la lógica de incidentes o eventos críticos.

---

## Arquitectura

El sistema sigue una arquitectura modular y preparada para eventos.

Flujo principal:

```txt
Sensores simulados → API → Validación DTO → Mongoose → MongoDB
```

Flujo proyectado con eventos:

```txt
Telemetría → Procesamiento → Alertas → Kafka → Sistemas externos
```

Kafka será integrado en sprints posteriores para distribuir eventos hacia otros sistemas consumidores.

---

## Comandos útiles

### Instalar dependencias localmente

```bash
npm install
```

### Ejecutar en desarrollo local

```bash
npm run start:dev
```

### Compilar proyecto

```bash
npm run build
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

Proyecto académico en fase inicial.

Actualmente incluye:

- Ingestión básica de telemetría
- Persistencia en MongoDB
- Esquema de alertas
- Contratos iniciales de eventos
- Documentación Swagger
- Contenerización con Docker

Próximos pasos:

- Generación automática de datos simulados
- Reglas para generar alertas automáticamente
- Integración con Kafka
- Publicación y consumo de eventos

Actualmente en desarrollo.
## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
