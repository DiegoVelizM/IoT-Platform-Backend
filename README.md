# IoT Platform Backend

Backend de plataforma IoT desarrollado con NestJS, MongoDB, Mongoose y Docker.

## Características

- API REST con NestJS
- Documentación Swagger/OpenAPI
- Persistencia de telemetría con MongoDB
- Modelado y validación mediante Mongoose
- Docker y Docker Compose
- Ingestión de telemetría
- Validaciones DTO
- Simulación de sensores
- Definición y prueba de contratos de eventos
- Arquitectura orientada a eventos (preparación para Kafka)

---

## Tecnologías

- NestJS
- TypeScript
- MongoDB
- Mongoose
- Docker
- Swagger / OpenAPI

---

## Instalación local

```bash
npm install
```

---

## Variables de entorno

Crear archivo `.env`:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/sensores_db
JWT_SECRET=super_secret_key
```

---

## Ejecutar en desarrollo

```bash
npm run start:dev
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

## Endpoints principales

### Telemetría

```http
POST /telemetry
```

Recibe y almacena telemetría de sensores simulados.

---

### Sensores

```http
GET /sensors
GET /sensors/latest
GET /sensors/sensor/:sensorId
```

Permiten consultar lecturas almacenadas en MongoDB.

---

### Eventos (testing temporal)

```http
POST /events/test
```

Endpoint temporal utilizado para validar contratos y recepción de eventos antes de la integración con Kafka.

---

### Health Check

```http
GET /health
```

Verifica disponibilidad del backend.

---

## Persistencia

La telemetría se almacena en MongoDB mediante Mongoose.

Los documentos incluyen:
- sensorId
- ubicación
- temperatura
- humedad
- nivel de gas
- batería
- coordenadas GPS
- timestamp automático

---

## Arquitectura

El sistema sigue una arquitectura modular y orientada a eventos.

Flujo principal:

```txt
Sensores simulados → API → Procesamiento → MongoDB → Eventos
```

La integración con Kafka será implementada en sprints posteriores.

---

## Estado del proyecto

Proyecto académico orientado a simulación, procesamiento y distribución de telemetría IoT en tiempo real.

Actualmente en desarrollo.
## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
