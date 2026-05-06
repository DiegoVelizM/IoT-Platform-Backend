# IoT Platform Backend

Backend de plataforma IoT desarrollado con NestJS, MongoDB y Docker.

## Características

- API REST con NestJS
- Swagger/OpenAPI
- Persistencia MongoDB
- Docker y Docker Compose
- Endpoint de telemetría
- Sistema de alertas
- Validaciones DTO
- Simulación de sensores

---

## Tecnologías

- NestJS
- TypeScript
- MongoDB
- Mongoose
- Docker
- Swagger

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

### Health Check

```http
GET /health
```

### Sensores

```http
GET /sensors
GET /sensors/latest
GET /sensors/alerts
GET /sensors/sensor/:sensorId
```

---

## Estado del proyecto

Proyecto académico orientado a simulación y procesamiento de telemetría IoT.

Actualmente en desarrollo.
## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
