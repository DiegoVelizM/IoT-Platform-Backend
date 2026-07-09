# IoT Platform Backend

Backend de plataforma IoT desarrollado con NestJS, MongoDB, Kafka y Docker. Orientado a la simulación, recepción, procesamiento y almacenamiento de telemetría de **sensores médicos simulados**.

## Descripción

Este proyecto corresponde al backend de una plataforma IoT para monitoreo de insumos médicos (cadena de frío) y signos vitales de pacientes. El sistema recibe lecturas de sensores simulados o reales, las persiste en MongoDB, evalúa umbrales para generar alertas automáticamente y publica eventos hacia Kafka para integración con sistemas externos.

**Proyecto 08 — Plataforma IoT (NestJS).** Somos **backend sin frontend**: dashboards, tendencias y visualización las cubre **P09** consumiendo nuestros eventos HTTP. Dominio activo: sensores médicos domiciliarios alineados con **P01 — Salud**. Logística (P02) queda fuera de alcance (sin equipo contraparte).

### Integraciones

| Proyecto | Dirección | Estado | Contrato |
|----------|-----------|--------|----------|
| **P01 — Salud** | P01 → P08 | ✅ Listo | `GET /sensors/*`, `POST /telemetry` |
| **P09 — Analítica** | P08 → P09 | ✅ Implementado | `POST /v1/events` (envelope snake_case) |
| **P11 — Incidentes** | P08 → P11 | ✅ Implementado | `POST /api/v1/alertas` + `alert_resolved` |
| **P06 — Notificaciones** | P08 → P06 | ✅ Implementado | HTTP con reintentos; alertas `warning`/`critical` |
| **P02 — Logística** | — | ❌ Fuera de alcance | Sin contraparte en el curso |

### URLs de producción

| Recurso | URL |
|---------|-----|
| API + Swagger P08 | https://iot-platform-backend-bm5b.onrender.com/docs |
| Health | https://iot-platform-backend-bm5b.onrender.com/health |
| Ingesta P09 | https://analisis-proyecto-ti.onrender.com/v1/events |

---
## Características

- API REST con NestJS
- Documentación con Swagger/OpenAPI
- Persistencia de telemetría con MongoDB y Mongoose
- Validaciones mediante DTOs (`class-validator`)
- Simulación automática de sensores médicos (hasta 1.000) y **Simulation Demo** para cátedra
- Generación automática de alertas según umbrales configurables
- Publicación de eventos con Kafka (productor)
- Consumo de eventos Kafka internos (consumidor en el mismo proceso)
- Docker y Docker Compose (backend, MongoDB, Kafka, Zookeeper)
- Health check con verificación de conexión a MongoDB y estado Kafka (productor + consumidor)

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

Copiar la plantilla y ajustar valores:

```bash
cp .env.example .env
```

Variables mínimas para Docker local:

```env
PORT=3000
MONGODB_URI=mongodb://mongo:27017/sensores_db
KAFKA_BROKER=kafka:9092
INTERNAL_API_KEY=local-internal-api-key
SIMULATION_API_KEY=local-simulation-api-key
CORS_ORIGIN=http://localhost:3000
READINGS_TTL_DAYS=7
```

| Variable | Efecto |
|----------|--------|
| `CORS_ORIGIN` | Orígenes permitidos (separados por coma). Si no se define, CORS abierto (solo recomendado en local) |
| `INTERNAL_API_KEY` | Protege `POST /alerts` manual (header `X-Internal-Api-Key`). Las alertas automáticas por telemetría no lo requieren |
| `SIMULATION_API_KEY` | Protege `POST /simulation/start` y `/stop` (header `X-Simulation-Key`) |

**Retención de lecturas (MongoDB TTL):** por defecto las lecturas en `sensorreadings` expiran a los **7 días** (`createdAt`). MongoDB las elimina en background. `READINGS_TTL_DAYS=0` desactiva el TTL (útil en pruebas de escala). No afecta alertas ni lo que P09 almacene por su cuenta.

**Paginación:** `GET /sensors`, `GET /sensors/sensor/:id`, `GET /alerts` y `GET /alerts/sensor/:id` aceptan `?page=1&limit=25` (máx `limit=100`).

**Kafka local (Docker):** solo `KAFKA_BROKER=kafka:9092` — sin usuario ni contraseña.

Opcional:

```env
KAFKA_CLIENT_ID=iot-platform-backend
KAFKA_CONSUMER_GROUP_ID=iot-platform-consumer
```

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

**Integración con analítica (Proyecto 09):** el backend reenvía telemetría y alertas vía HTTP. Se configura por variables de entorno (sin URLs hardcodeadas):

```env
ANALYTICS_EVENTS_URL=https://analisis-proyecto-ti.onrender.com/v1/events
ANALYTICS_EVENTS_ENABLED=true
ANALYTICS_EVENTS_SOURCE=iot_devices
```

| Variable | Efecto |
|----------|--------|
| `ANALYTICS_EVENTS_URL` | Endpoint de P09. **Si no está definida, la integración queda deshabilitada** (se registra un warning al arrancar) |
| `ANALYTICS_EVENTS_ENABLED` | `false` desactiva el envío aunque haya URL |
| `ANALYTICS_EVENTS_SOURCE` | Campo `source` del envelope (default `iot_devices`) |

**Integración con notificaciones (Proyecto 06):** el backend puede enviar notificaciones cuando se generan alertas `warning`/`critical`:

```env
NOTIFICATIONS_API_URL=https://ucn-agil-notificaciones.up.railway.app
NOTIFICATIONS_API_KEY=<api key entregada por P06>
NOTIFICATIONS_DEFAULT_EMAIL=<correo por defecto para alertas>
NOTIFICATIONS_DEFAULT_PHONE=<telefono por defecto opcional>
NOTIFICATIONS_ENABLED=true
```

| Variable | Efecto |
|----------|--------|
| `NOTIFICATIONS_API_URL` | Endpoint base de P06. Si no está definida, la integración queda deshabilitada |
| `NOTIFICATIONS_API_KEY` | API key enviada en header `x-api-key` |
| `NOTIFICATIONS_DEFAULT_EMAIL` | Destinatario por defecto cuando la alerta no trae `recipient.email` |
| `NOTIFICATIONS_DEFAULT_PHONE` | Destinatario telefónico por defecto para SMS (opcional) |
| `NOTIFICATIONS_ENABLED` | `false` desactiva la integración aunque exista URL/API key |

> **Rate limit de P09:** su API rechaza exceso de tráfico con HTTP 429 (`máximo 100 requests por 60s`). Cada lectura y cada alerta generan un `POST` a P09. Para demo integrada con su dashboard en pantalla, usar **≤20–30 sensores** e intervalo **≥15 s**. Para pruebas de escala con 1.000 sensores, desactivar analytics: `ANALYTICS_EVENTS_ENABLED=false`.

#### Hallazgos de integración P09 (pruebas 03–04/07)

P09 corre en **Render free** y responde desde su propio backend. P08 solo reenvía eventos; los errores HTTP vienen de **P09**, no de un fallo de ingestión en P08. MongoDB y Kafka en P08 **siguen funcionando** aunque falle el envío a P09.

| Categoría en log | Origen | Qué significa |
|------------------|--------|---------------|
| `[RATE_LIMIT]` | Respuesta **P09** HTTP 429 | Superado el límite de 100 req/min. Body típico: `{"detail":"Rate limit excedido: máximo 100 requests por 60s"}` |
| `[SERVER_ERROR]` | Respuesta **P09** HTTP 502/503 | P09/Render no puede atender (saturado, reiniciando, cold start) |
| `[TIMEOUT]` | Sin respuesta HTTP en 10 s | P09 no alcanza a responder (`UND_ERR_CONNECT_TIMEOUT`). Suele aparecer bajo carga extrema |
| `[NETWORK_ERROR]` | Conexión cortada | `ECONNRESET`, `fetch failed`, etc. |

Ejemplo de log (PR #20, `AnalyticsEventsService`):

```txt
WARN P09 publish failed (telemetry_received) [RATE_LIMIT]: {"detail":"Rate limit excedido..."} → https://analisis-proyecto-ti.onrender.com/v1/events
WARN P09 publish failed (telemetry_received) [SERVER_ERROR]: HTTP 503 → https://analisis-proyecto-ti.onrender.com/v1/events
WARN P09 publish failed (telemetry_received) [TIMEOUT]: UND_ERR_CONNECT_TIMEOUT: Connect Timeout Error → https://...
```

**Degradación observada bajo carga alta** (ej. 1000 sensores): primero `429`, luego `503`, luego predominan `TIMEOUT`. No es un bug de P08; es el límite de capacidad de P09/Render.

**Dos pruebas separadas (no mezclar):**

| Objetivo | Configuración |
|----------|---------------|
| Escala P08 (1000 sensores, Mongo, Kafka) | `ANALYTICS_EVENTS_ENABLED=false` — local o prod; no satura P09 |
| Demo integrada con dashboard P09 | `quantity: 20–30`, `frequencyMs: 15000–120000` — analytics activo |

> Correr 1000 sensores con analytics activo **desde local** igual golpea P09 en prod (misma URL). Desactivar analytics en pruebas de escala.

**P11 vs P09:** P11 recibe alertas según `INCIDENTS_MIN_SEVERITY` (default actual `warning`) y reintenta hasta 4 veces. P09 recibe **cada telemetría + cada alerta** sin reintentos, para no multiplicar carga ante `429`.

Los fallos hacia P09/P11 se loguean con categoría explícita (`RATE_LIMIT`, `SERVER_ERROR`, `CLIENT_ERROR`, `NETWORK_ERROR`, `TIMEOUT`), URL destino y detalle de red cuando aplica. Implementación: `src/common/utils/http-fetch-error.util.ts`.

**Integración con incidentes (Proyecto 11):** al generar una alerta, el backend envía un `POST` al endpoint de ingesta de P11:

```env
INCIDENTS_ALERTS_URL=https://proyecto11-mochicode.onrender.com/api/v1/alertas
INCIDENTS_API_KEY=<api key Zero Trust entregada por P11>
INCIDENTS_JWT_TOKEN=<token JWT emitido por P12, cuando este disponible>
INCIDENTS_SYSTEM_ID=P08
INCIDENTS_MIN_SEVERITY=warning
INCIDENTS_ALERTS_ENABLED=true
```

| Variable | Efecto |
|----------|--------|
| `INCIDENTS_ALERTS_URL` | Endpoint de P11 (`POST /api/v1/alertas`). **Si no está definida, la integración queda deshabilitada** |
| `INCIDENTS_API_KEY` | API Key Zero Trust de P11. Se envía en el header `x-api-key` |
| `INCIDENTS_JWT_TOKEN` | Bearer token para autenticación futura con P12, si P11 lo habilita |
| `INCIDENTS_SYSTEM_ID` | Identificador del sistema emisor (default `P08`) |
| `INCIDENTS_MIN_SEVERITY` | Severidad mínima que se envía a P11: `warning` (default actual) o `critical`. Con `critical`, las alertas `warning` no se envían a incidentes |
| `INCIDENTS_ALERTS_ENABLED` | `false` desactiva el envío aunque haya URL |

> **Umbral configurable en P11:** actualmente P08 envía a P11 alertas `warning` y `critical` (default `INCIDENTS_MIN_SEVERITY=warning`). Si necesitas reducir ruido, configura `INCIDENTS_MIN_SEVERITY=critical`.

Payload enviado a P11 (formato camelCase plano dentro del envelope de P11):

```json
{
  "sistema_id": "P08",
  "creado_en": "2026-07-02T20:00:00.000Z",
  "payload": {
    "eventId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "eventType": "alert_generated",
    "occurredAt": "2026-07-02T20:00:00.000Z",
    "source": "iot-platform",
    "sensorId": "THERMO-001",
    "assetId": "MEDKIT-001",
    "alertType": "temperature_out_of_range",
    "severity": "warning",
    "message": "Temperature out of range: 12°C"
  }
}
```

> P11 exige `sistema_id` en la raíz; el evento va dentro de `payload`. También aceptan el formato snake_case anidado de P09, pero usamos camelCase plano por alineación con Kafka interno.

**Cierre de incidentes (recuperación):** cuando la telemetría vuelve a la normalidad, P08 marca la alerta como `resolved: true` en MongoDB y envía el mismo `POST` con `eventType: "alert_resolved"` y solo `sensorId` + `alertType`. P11 correlaciona con el incidente activo del sensor y lo pasa a CERRADO.

**Regla de evaluación por campo:** cada métrica se evalúa de forma independiente en cada lectura. Si el valor enviado está **dentro del rango**, se resuelve la alerta de ese tipo; si está **fuera de rango**, se crea o mantiene la alerta. La simulación y el escenario demo `recovery-normal-reading` envían lecturas **completas** (batería, conexión y métricas clínicas), por lo que en la práctica se resuelven todas las alertas abiertas del sensor al recuperarse.

> **Lecturas parciales:** si un campo no viene en el JSON (p. ej. solo `glucoseLevel` sin `batteryLevel`), solo se evalúan los campos presentes. Una glucosa normal resuelve `glucose_out_of_range`, pero no cierra `low_battery` si esa alerta estaba abierta y no se envió batería. Para integradores (P01): conviene incluir `batteryLevel` y `connectionStatus` en cada POST.

```json
{
  "sistema_id": "P08",
  "creado_en": "2026-07-04T14:00:00.000Z",
  "payload": {
    "eventId": "...",
    "eventType": "alert_resolved",
    "occurredAt": "2026-07-04T14:00:00.000Z",
    "source": "iot-platform",
    "sensorId": "OXI-001",
    "alertType": "sensor_offline"
  }
}
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
GET /sensors/devices
GET /sensors/sensor/:sensorId
```

Permiten consultar lecturas almacenadas en MongoDB. `GET /sensors/devices` devuelve un catálogo paginado de sensores distintos (última lectura, `sensorType`, filtros `search` y `sensorType`) — pensado para que P01 vincule dispositivos.

---
### Simulación

```http
GET  /simulation/sensors?quantity=4
POST /simulation/start   # requiere X-Simulation-Key
POST /simulation/stop    # requiere X-Simulation-Key
```

Permiten generar sensores simulados e iniciar/detener la emisión automática de lecturas periódicas.

**Control de simulación (start/stop):** solo el equipo P08 o quien reciba la clave. En cada `POST /simulation/start` o `stop` enviar el header:

```http
X-Simulation-Key: <valor de SIMULATION_API_KEY en Render>
```

Sin clave válida → `401 Unauthorized`. Otros equipos (P01, P09) deben usar `GET /sensors/*` o `POST /telemetry` para probar la API.

En local, definir `SIMULATION_API_KEY` en `.env`.

La simulación genera fallos `sensor_offline` con baja probabilidad para ejercitar el topic Kafka `sensor_offline` y las alertas críticas. Por defecto usa 2% (`0.02`) y aumenta levemente cuando la batería simulada está baja o crítica.

La batería simulada es aleatoria entre **5 % y 100 %** por lectura (`getRandomBatteryLevel`), con promedio teórico ~50 %. En el dashboard de P09 es normal ver ~49 % de batería promedio y muchos sensores en “batería baja”.

```env
SIMULATION_OFFLINE_PROBABILITY=0.02
# Probabilidad de lectura anómala forzada (0–1). Default 0. Ej: 0.05 = 5%
# SIMULATION_ANOMALY_PROBABILITY=0
```

| Variable | Efecto |
|----------|--------|
| `SIMULATION_OFFLINE_PROBABILITY` | Probabilidad de `connectionStatus: offline` por lectura (default `0.02`, máx `0.25`) |
| `SIMULATION_ANOMALY_PROBABILITY` | Fuerza valores fuera de umbral con la probabilidad indicada (default `0` = desactivado) |

Usar `0` en offline si se desea desactivar eventos offline en una demo específica.

**Auto-start al arrancar** (sin llamar manualmente a `/simulation/start`):

```env
SIMULATION_AUTO_START=true
SIMULATION_AUTO_SENSOR_COUNT=4
SIMULATION_AUTO_FREQUENCY_MS=10000
SIMULATION_STAGGER_MS=
```

| Variable | Efecto |
|----------|--------|
| `SIMULATION_AUTO_START` | `true` inicia la simulación al levantar el backend |
| `SIMULATION_AUTO_SENSOR_COUNT` | Cantidad de sensores en auto-start (default `4`, máximo `50`) |
| `SIMULATION_AUTO_FREQUENCY_MS` | Intervalo entre lecturas por sensor en auto-start (default `10000` ms) |
| `SIMULATION_STAGGER_MS` | Retardo entre el arranque de cada sensor. Si no se define, se reparte automáticamente dentro del intervalo |

En **Render (prod)** se usa auto-start conservador: 4 sensores cada 10 s (~0,4 lecturas/s), con arranque escalonado para no saturar MongoDB, Kafka, P09 ni P11. Para pruebas de escala (hasta 1.000 sensores), usar `POST /simulation/start` en **local** con Docker.

**Generación de hasta 1.000 sensores:** `GET /simulation/sensors?quantity=1000` devuelve IDs únicos rotando tipos (`THERMO-001`, `GLUCO-001`, `OXI-001`, `BP-001`, `THERMO-002`, …). `POST /simulation/start` acepta `quantity` hasta 1000 y `frequencyMs` entre **1000 y 120000** (2 min).

Ejemplo — iniciar simulación manual con frecuencia global:

```json
{
  "frequencyMs": 5000
}
```

Ejemplo — escala local (hasta 1.000 sensores, solo en Docker):

```json
{
  "quantity": 1000,
  "frequencyMs": 10000
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

### Perfiles de simulación recomendados

P08 no tiene frontend propio. La **visualización y tendencias** del enunciado las cubre **P09** con los eventos HTTP que enviamos. Estos perfiles evitan saturar integraciones externas:

| Perfil | Dónde | Configuración | Uso |
|--------|-------|---------------|-----|
| **Prod / demo diaria** | Render | Auto-start: 4 sensores cada 10 s | Swagger, P01, flujo estable |
| **Demo con P09 en pantalla** | Local o prod | `quantity: 20–30`, `frequencyMs: 15000+` | Respetar rate limit P09 (100 req/min) |
| **Escala 1.000 sensores** | Solo Docker local | `quantity: 1000`, `frequencyMs: 60000–120000`, `ANALYTICS_EVENTS_ENABLED=false` | Validar Mongo + Kafka + consumer; no enviar a P09 |

Ejemplo — escala local sin P09:

```json
{
  "quantity": 1000,
  "frequencyMs": 120000
}
```

Ejemplo — demo integrada con P09:

```json
{
  "quantity": 30,
  "frequencyMs": 15000
}
```

> **P02 (logística):** sin equipo contraparte; el dominio activo es salud/P01. No hay requisito de GPS en la rúbrica.

### Simulation Demo (cátedra)

Endpoints para demostrar alertas e integraciones sin depender del auto-start ni de valores aleatorios:

```http
GET  /simulation/demo/scenarios
POST /simulation/demo/scenarios/:scenarioId/run   # requiere X-Simulation-Key
POST /simulation/demo/telemetry                   # requiere X-Simulation-Key
```

1. Listar escenarios (`low-battery-warning`, `glucose-critical`, `recovery-normal-reading`, etc.).
2. Ejecutar uno con `X-Simulation-Key` → flujo completo: MongoDB, Kafka, P11, P06 (y P09 si está activo).
3. Verificar en panel P11 y correo P06; para recuperación usar `recovery-normal-reading`.

Ejemplo:

```http
POST /simulation/demo/scenarios/low-battery-warning/run
X-Simulation-Key: <SIMULATION_API_KEY>
```

---
### Alertas

```http
POST /alerts
GET  /alerts
GET  /alerts/sensor/:sensorId
```

Permiten crear y consultar alertas asociadas a sensores. Al crear una alerta manualmente, se publica el evento `alert_generated` en Kafka.

**Resolución automática:** al recibir telemetría con valores **dentro de rango**, se cierran las alertas abiertas del mismo tipo para ese sensor (y se notifica `alert_resolved` a P11). Requiere que el campo correspondiente venga en la lectura; ver sección *Cierre de incidentes* más arriba.

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

`POST /alerts` requiere header `X-Internal-Api-Key` (valor `INTERNAL_API_KEY` en servidor).

---

### Eventos

```http
POST /events/test
```

Endpoint temporal para validar contratos de eventos. Actualmente registra el evento en consola; no publica a Kafka.

### Notificaciones internas (P06)

```http
POST /notifications/send
POST /notifications/test
GET  /notifications/failed
POST /notifications/retry-failed
```

Estos endpoints son de operación interna y requieren `X-Internal-Api-Key`. Se usan para pruebas controladas del flujo con P06 y para reintentar envíos fallidos persistidos en MongoDB.

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

Verifica disponibilidad del backend, MongoDB y Kafka. Ejecuta un **probe activo** del productor contra el broker en cada consulta (`listTopics`); el estado del **consumidor** se reporta desde memoria (`kafka.consumer`).

- `kafka.connected` → productor (publicar eventos). Si falla junto con MongoDB, `status` pasa a `degraded`.
- `kafka.consumer.connected` → consumidor escuchando topics. **Informativo**: la API sigue operativa aunque el consumer esté caído; sirve para validar el ciclo event-driven en demo.
- `kafka.consumer.messagesConsumed` → contador desde el arranque del proceso.

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
       ↓
  KafkaConsumerService (log / contador; no re-guarda en Mongo ni reenvía a P09)
  → AnalyticsEventsService → HTTP P09 (dashboards y tendencias)
  → IncidentsEventsService → HTTP P11 (umbral configurable warning/critical)
```

P08 expone datos vía API (`GET /sensors/*`) para **P01** y eventos HTTP para **P09** (visualización) y **P11** (incidentes críticos). No implementamos paneles propios.

**Dos formatos de evento (no mezclar):**

| Canal | Formato | Ejemplo |
|-------|---------|---------|
| Kafka interno (P08) | JSON plano camelCase | `eventType`, `sensorId`, `alertType` |
| HTTP hacia P09 | Envelope snake_case | `event_type`, `payload` anidado |

Mapper P09: `src/analytics/analytics-event.mapper.ts`.

**Kafka local vs nube** (`src/kafka/kafka.config.ts`):

| Entorno | Credenciales Kafka | Modo | Conexión |
|---------|-------------------|------|----------|
| Docker local | sin `KAFKA_USERNAME`/`PASSWORD` | `local` | `kafka:9092` PLAINTEXT |
| Render + Confluent | con credenciales | `cloud` | SSL + SASL |

**Prueba de escala 1.000 sensores:** ejecutar solo en **Docker local** (`ANALYTICS_EVENTS_ENABLED=false`). No usar Render free ni Confluent trial para carga masiva — límites de RAM, cold starts y cuotas. La demo end-to-end en producción usa volumen bajo (auto-start 4 sensores / 10 s). Evidencia documentada: [`docs/local/INFORME-PRUEBAS-ESCALA-E-INTEGRACIONES.md`](docs/local/INFORME-PRUEBAS-ESCALA-E-INTEGRACIONES.md).

Topics Kafka publicados y consumidos internamente:
| Topic | Descripción |
|-------|-------------|
| `telemetry_received` | Nueva lectura procesada |
| `alert_generated` | Alerta creada |
| `sensor_offline` | Sensor reportado como offline |

Tras `POST /telemetry` en Docker deberías ver en logs del backend:

```txt
Message sent to topic telemetry_received
Consumed telemetry_received [partition 0] sensor=OXI-001 event=telemetry_received total=1
```


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

Responde `200 OK` con `status: "degraded"`. Kafka productor se verifica en tiempo real; si el broker está disponible, reconecta el productor automáticamente:

```json
{
  "status": "degraded",
  "service": "iot-platform-backend",
  "database": "connected",
  "kafka": {
    "connected": false,
    "broker": "kafka:9092",
    "lastError": "Connection error",
    "lastErrorCode": "KAFKA_CONNECTION_FAILED",
    "consumer": {
      "connected": true,
      "groupId": "iot-platform-consumer",
      "messagesConsumed": 12
    }
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

El productor Kafka (`KafkaProducerService`) y el consumidor (`KafkaConsumerService`) operan de forma **no bloqueante** respecto a la API REST: un fallo de Kafka **no impide** que la telemetría o las alertas se guarden en MongoDB. Los fallos del productor se reportan mediante códigos estandarizados (`KAFKA_CONNECTION_FAILED`, `KAFKA_PUBLISH_FAILED`) en el array `warnings` de las respuestas de escritura y en `/health`. El consumidor expone su estado en `kafka.consumer` sin afectar el `status` general salvo que también falle el productor.

### Escenarios de error

| Escenario | Comportamiento de la API | Log del servidor |
|-----------|--------------------------|------------------|
| Broker no disponible al iniciar | La app arranca igualmente; productor y/o consumidor quedan desconectados | `Kafka connect error` / `Kafka consumer connection error` |
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

- `Connected to Kafka (local) at kafka:9092` — productor OK al arrancar
- `Consumed telemetry_received [partition 0] sensor=...` — consumidor procesó un evento
- `Kafka connect error` — broker inaccesible al iniciar productor
- `Kafka consumer connection error` — broker inaccesible al iniciar consumidor
- `Failed to send message to topic` — publicación fallida (datos ya persistidos en MongoDB)

### Variable de entorno

```env
KAFKA_BROKER=kafka:9092
KAFKA_CONSUMER_GROUP_ID=iot-platform-consumer
```

Si el broker es incorrecto o inalcanzable, la API sigue operativa pero los eventos no se distribuyen hasta que Kafka esté disponible.

---

## Estado del proyecto

**Última actualización:** 09/07/2026 · Entrega académica P08.

| Área | Estado |
|------|--------|
| MVP (API, Mongo, alertas, Swagger, deploy) | ✅ Completo |
| Integraciones P09, P11, P06 | ✅ Verificadas en demo |
| Kafka productor + consumidor interno | ✅ Publica y consume (log/contador) |
| Simulación + Simulation Demo | ✅ Hasta 1.000 sensores; escenarios cátedra |
| Retención lecturas (TTL 7 días) | ✅ `READINGS_TTL_DAYS` |
| Agregación dispositivos | ✅ `GET /sensors/devices` |
| Evidencia escala 1.000 sensores | ✅ [`docs/local/INFORME-PRUEBAS-ESCALA-E-INTEGRACIONES.md`](docs/local/INFORME-PRUEBAS-ESCALA-E-INTEGRACIONES.md) |
| Confirmación formal P01 | ⏳ Pendiente coordinación externa |
| JWT / auth API | ⏳ Fuera de MVP (deps preparadas) |

### Documentación del repositorio

| Documento | Contenido |
|-----------|-----------|
| **README.md** (este archivo) | Instalación, configuración, endpoints, integraciones, arquitectura |
| [`docs/local/INFORME-PRUEBAS-ESCALA-E-INTEGRACIONES.md`](docs/local/INFORME-PRUEBAS-ESCALA-E-INTEGRACIONES.md) | Evidencia cuantitativa prueba 1.000 sensores + demo P11/P06 |
| [`docs/AUDITORIA-FINAL-ENTREGA.md`](docs/AUDITORIA-FINAL-ENTREGA.md) | Revisión técnica pre-entrega |
| [`docs/ESTADO-PROYECTO.md`](docs/ESTADO-PROYECTO.md) | Índice breve (apunta aquí; sin duplicar contenido) |

### Decisiones de arquitectura

1. Dominio médico (P01), no logística (P02).
2. MongoDB = fuente de verdad para `GET /sensors/*`.
3. Kafka interno camelCase; P09 HTTP snake_case; P11 envelope con `sistema_id`.
4. Kafka prod = Confluent Cloud; escala masiva = Docker local.
5. Visualización = P09; P08 no tiene frontend.
6. `POST /telemetry` público por contrato P01; simulación y alertas manuales con API keys.

---