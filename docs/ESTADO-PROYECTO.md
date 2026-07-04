# Estado del Proyecto 08 — IoT Platform Backend

**Última actualización:** 04/07/2026  
**Entrega:** 09/07/2026 (sin margen ese día)  
**Ventana de trabajo efectiva:** 02/07 → 08/07 (6 días)

Documento maestro de contexto para el equipo. Si algo no cuadra con el código, revisar `main` y el README antes de este archivo.

---

## 1. Resumen ejecutivo

Somos el **Proyecto 08 — Plataforma IoT** (NestJS). El backend recibe telemetría de sensores médicos simulados, la persiste en MongoDB, genera alertas por umbrales, publica eventos en Kafka y reenvía eventos a **P09 (analítica)** y **P11 (incidentes)** por HTTP.

**El núcleo funciona y está en producción.** P08 es **backend sin frontend**: la visualización, tendencias y dashboards del enunciado los cubre **P09** consumiendo nuestros eventos HTTP. No tenemos obligación de implementar paneles propios.

Lo que falta para cerrar el enunciado no es rehacer el proyecto, sino completar **consumer Kafka**, **merge/deploy de simulación a escala**, **evidencia documentada de prueba 1.000 sensores**, **retención/agregación mínima** e **integración P06** (otro compañero).

| Métrica | Avance estimado |
|---------|-----------------|
| MVP académico (API + Mongo + alertas + Swagger + deploy) | **~90 %** |
| Entregable presentable (auto-sim + P09 + P01 + P11 + consumer + demo) | **~80 %** |
| Enunciado P08 completo (consumer, retención, tests escala, P06) | **~65–70 %** |

**Prioridad hasta el 08/07:** consumer Kafka → evidencia 1.000 sensores → retención mínima → P06 → documentar demo → env vars simulación en Render.

---

## 2. Qué es este proyecto

### Rol del grupo

- **Grupo:** Proyecto 08 — Plataforma IoT Backend
- **Stack:** NestJS, TypeScript, MongoDB (Mongoose), Kafka (KafkaJS), Docker
- **Dominio elegido:** sensores médicos domiciliarios (alineado con **P01 — Salud**)
- **Descartado:** integración con logística (no hay grupo encargado; GPS, humedad, aceleración fuera de alcance)

### Sensores modelados

| Sensor | ID | Activo | Métricas |
|--------|-----|--------|----------|
| Termómetro (cadena de frío) | `THERMO-001` | `MEDKIT-001` | temperatura (°C) |
| Glucómetro | `GLUCO-001` | `PATIENT-001` | glucosa (mg/dL) |
| Pulsioxímetro | `OXI-001` | `PATIENT-001` | SpO₂ (%), FC (bpm) |
| Esfigmomanómetro | `BP-001` | `PATIENT-001` | presión sistólica/diastólica |

Cada lectura incluye `sensorId`, `assetId`, `sensorType`, `batteryLevel`, `connectionStatus`.

---

## 3. Integraciones con otros proyectos

| Proyecto | Relación | Dirección | Estado | Notas |
|----------|----------|-----------|--------|-------|
| **P01 — Salud** | Consume nuestra API | P01 → P08 | ⚠️ Contrato listo, pendiente confirmación | `GET /sensors/*`, `POST /telemetry`. Falta que P01 confirme si solo consumen y si el formato actual les sirve |
| **P09 — Analítica** | Recibe eventos HTTP + dashboards | P08 → P09 | ✅ Implementado | `POST /v1/events`. **Visualización/tendencias = responsabilidad de P09**, no de P08 |
| **P11 — Incidentes** | Recibe alertas críticas | P08 → P11 | ✅ Implementado | Solo `critical` (`INCIDENTS_MIN_SEVERITY=critical`). P11 responde HTTP 202 |
| **P06 — Notificaciones** | Posible consumidor de alertas | P08 → P06 | ⏳ Pendiente | A cargo de otro compañero del equipo |
| **P02 — Logística** | — | — | ❌ Fuera de alcance | Sin equipo contraparte; dominio activo = salud/P01. No hay rúbrica que exija GPS obligatorio |

### Hallazgos integración P09 (pruebas 03–04/07)

Documentación ampliada en README. Resumen:

**Quién responde:** los HTTP 429/503 y los timeouts son respuestas o fallos de **conexión hacia P09** (`analisis-proyecto-ti.onrender.com`). P08 loguea el resultado; MongoDB y Kafka **no se ven afectados**.

| Categoría log | HTTP / causa | Observado cuando |
|---------------|--------------|------------------|
| `[RATE_LIMIT]` | 429 | >100 req/min. Body: `Rate limit excedido: máximo 100 requests por 60s` |
| `[SERVER_ERROR]` | 502/503 | P09/Render saturado o reiniciando |
| `[TIMEOUT]` | `UND_ERR_CONNECT_TIMEOUT` (10 s) | Carga extrema; P09 no responde HTTP |
| `[NETWORK_ERROR]` | `ECONNRESET`, etc. | Conexión cortada |

**Degradación bajo 1000 sensores:** 429 → 503 → TIMEOUT (en ese orden aproximado). Con 1000 sensores cada 60–120 s sigue superándose el rate limit si analytics está activo (~500–1000 telemetría/min).

**Pruebas separadas:**

| Objetivo | Config |
|----------|--------|
| Escala P08 | `ANALYTICS_EVENTS_ENABLED=false`; 1000 sensores OK |
| Demo P09 en pantalla | ≤20–30 sensores, intervalo ≥15 s (hasta 120 s) |

**P11 vs P09:** P11 tolera mejor el tráfico (solo `critical`, 4 reintentos). P09 recibe telemetría + alertas sin reintentos.

**Logging:** PR #20 — `src/common/utils/http-fetch-error.util.ts`, categorías en `AnalyticsEventsService` e `IncidentsEventsService`.

**Simulación:** `frequencyMs` máximo subido a **120000** (2 min) en commit `73e8e98` para reducir carga opcional hacia P09.

**Dashboard P09:** batería promedio ~49 % es esperable (random 5–100 % por lectura). Con ~984 sensores activos la integración ingestiona datos; el cuello de botella es capacidad de P09, no formato P08.

### Formato de eventos (importante)

Hay **dos formatos** en el sistema:

1. **Kafka interno (P08):** JSON plano en camelCase (`eventId`, `eventType`, `sensorId`, …).
2. **HTTP hacia P09:** envelope snake_case (`source`, `event_type`, `payload`).

No mezclar. El mapper está en `src/analytics/analytics-event.mapper.ts`.

### URLs de producción

| Servicio | URL |
|----------|-----|
| Swagger P08 | https://iot-platform-backend-bm5b.onrender.com/docs |
| P09 (analítica) | https://analisis-proyecto-ti.onrender.com/v1/events |

---

## 4. Arquitectura actual

```
Sensor / Simulación
       ↓
 POST /telemetry  (o SimulationService → SensorsService.create)
       ↓
 SensorsService
   ├→ MongoDB (sensorreadings)
   ├→ Evaluación umbrales → AlertsService → MongoDB (alerts)
   ├→ KafkaProducerService → topics
   ├→ AnalyticsEventsService → HTTP P09 (dashboards/tendencias)
   └→ IncidentsEventsService → HTTP P11 (solo alertas critical)

GET /sensors/*  ← P01 y pruebas externas
```

### Topics Kafka

| Topic | Cuándo se publica |
|-------|-------------------|
| `telemetry_received` | Cada lectura guardada |
| `alert_generated` | Cada alerta creada |
| `sensor_offline` | Lectura con `connectionStatus: "offline"` |

### Lo que falta en arquitectura

```
Kafka Producer → topics → Kafka Consumer  ❌ NO EXISTE AÚN
```

Sin consumer, el patrón event-driven queda a medias (publicamos pero nadie en nuestro backend consume).

---

## 5. Infraestructura

### Local (Docker Compose)

| Servicio | Contenedor | Puerto |
|----------|------------|--------|
| Backend | `iot_backend` | 3000 |
| MongoDB | `sensores_mongo` | 27017 |
| Kafka | `sensores_kafka` | 9092 |
| Zookeeper | `sensores_zookeeper` | 2181 |

Arranque:

```bash
docker volume create backend_sensores_mongo_data
docker compose up --build
```

Swagger local: http://localhost:3000/docs

### Producción (Render + servicios externos)

| Componente | Proveedor | Notas |
|------------|-----------|-------|
| Backend API | Render (free, Oregon) | Docker, healthcheck `/` |
| MongoDB | Atlas | `MONGODB_URI` en Render |
| Kafka | Confluent Cloud (Basic, us-west-2) | SSL/SASL; topics creados manualmente si falla auto-create |

**Upstash Kafka:** descontinuado; no usar.

### Variables de entorno en Render

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `MONGODB_URI` | Sí | Atlas |
| `KAFKA_BROKER` | Sí | Broker Confluent |
| `KAFKA_USERNAME` | Sí | API Key Confluent |
| `KAFKA_PASSWORD` | Sí | API Secret Confluent |
| `KAFKA_SASL_MECHANISM` | Sí | `plain` |
| `ANALYTICS_EVENTS_URL` | Sí | URL P09 (`/v1/events`) |
| `ANALYTICS_EVENTS_ENABLED` | No | `true` por defecto en `render.yaml` |
| `SIMULATION_API_KEY` | Sí | Protege `POST /simulation/start` y `/stop` |
| `SIMULATION_AUTO_START` | No | `true` inicia simulación al arrancar (mergeado PR #19) |
| `SIMULATION_AUTO_SENSOR_COUNT` | No | Sensores en auto-start (default 4, máx 50 en prod) |
| `SIMULATION_AUTO_FREQUENCY_MS` | No | Intervalo auto-start (default 10 000 ms) |
| `SIMULATION_STAGGER_MS` | No | Delay entre arranque de sensores (throttling) |
| `INCIDENTS_ALERTS_URL` | No | URL P11 |
| `INCIDENTS_MIN_SEVERITY` | No | `critical` (default) — solo esas alertas van a P11 |

---

## 6. Avance detallado

### ✅ Implementado y mergeado en `main`

| Área | Detalle |
|------|---------|
| API REST | Telemetría, sensores, alertas, simulación, health, eventos test |
| Swagger | Documentación con errores estandarizados |
| MongoDB | Persistencia de lecturas y alertas |
| Alertas automáticas | Batería baja, offline, umbrales médicos (7 tipos) |
| Simulación | 4 sensores médicos, frecuencias configurables, auto-start (PR #19) |
| Escala simulación | Hasta 1.000 `sensorId` distintos + throttling con stagger (PR #19) |
| Simulación offline | Probabilidad configurable (`SIMULATION_OFFLINE_PROBABILITY`, default 2 %) |
| Protección simulación | Header `X-Simulation-Key` en start/stop |
| Kafka Producer | Local + Confluent Cloud (`kafka.config.ts`) |
| Integración P09 | HTTP automático en telemetría y alertas |
| Integración P11 | HTTP a alertas críticas (`INCIDENTS_MIN_SEVERITY=critical`, PR #18) |
| Manejo de errores | `HttpExceptionFilter`, códigos 400/404/500, warnings Kafka |
| Health check | Probe activo MongoDB + Kafka |
| Docker Compose | Healthchecks en todos los servicios |
| Deploy | Render + blueprint `render.yaml` |
| Documentación | README + `docs/` |

### ⚠️ Parcial / pendiente de cierre

| Área | Estado |
|------|--------|
| **Confirmación P01** | Contrato publicado; falta que P01 valide consumo y formato de telemetría |
| **Evidencia formal test escala** | Corrida hecha localmente; falta documentar con consumer Kafka y métricas |
| **Retención / agregación** | Requisito del enunciado; no implementado aún |
| **Env vars simulación en Render** | PR #19 mergeado; confirmar `SIMULATION_AUTO_START=true` en Environment manual |

### ❌ Pendiente (crítico para entrega)

| # | Tarea | Prioridad | Responsable sugerido |
|---|-------|-----------|----------------------|
| 1 | **Kafka Consumer** (`KafkaConsumerService`) | 🔴 Alta | Compañero (ver `docs/KAFKA-CONSUMER.md`) |
| 2 | **Evidencia test 1.000 sensores** documentada | 🔴 Alta | Equipo |
| 3 | **Env vars simulación en Render** | 🔴 Alta | Diego |
| 4 | **Retención / agregación mínima** | 🟡 Media | Equipo |
| 5 | **Integración P06** | 🟡 Media | Otro compañero |
| 6 | **Confirmación P01** | 🟡 Media | Coordinación externa |
| 7 | **Demo documentada** (pasos reproducibles) | 🟡 Media | Equipo |

### ❌ Pendiente (nice-to-have / post-MVP)

| Tarea | Notas |
|-------|-------|
| Deduplicación de alertas activas | Evitar alertas repetidas del mismo tipo |
| Conectar `/events/test` a Kafka | Endpoint temporal hoy solo loguea |
| Throttle explícito hacia P09 | Evitar spam de 429 en logs bajo carga |
| Kafka consumer en prod | Priorizar que funcione en local; prod es bonus |
| JWT / autenticación API | No aparece explícito en el enunciado P08; baja prioridad |

---

## 7. Estado Git (04/07/2026)

### Rama principal

```
main @ d44b5a4 — Merge PR #19 (simulation auto-start + escala 1000)
```

### Historial reciente en `main`

| PR / commit | Qué trajo |
|-------------|-----------|
| #19 | Auto-start, 1.000 sensores, stagger/throttling |
| #18 | P11: solo alertas `critical` (`INCIDENTS_MIN_SEVERITY`) |
| #14 | Docs estado del proyecto |
| #12 | Simulación `sensor_offline` con probabilidad configurable |
| #11 | P09 por env vars (sin URL hardcodeada) |
| #10 | Integración HTTP con P09 |

### Ramas activas

| Rama | Estado |
|------|--------|
| `feat/kafka-consumer` | Pendiente (otro compañero) |

---

## 8. Endpoints clave (contrato para otros grupos)

### Para P01 y consumidores externos

```http
GET  /sensors
GET  /sensors/latest
GET  /sensors/sensor/:sensorId
POST /telemetry
GET  /alerts
GET  /alerts/sensor/:sensorId
GET  /health
```

### Solo equipo P08 (requiere `X-Simulation-Key`)

```http
GET  /simulation/sensors?quantity=4   # hasta 1000
POST /simulation/start
POST /simulation/stop
```

### Ejemplo `POST /telemetry` (pulsioxímetro)

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

---

## 9. Qué falta explicado en criollo

### Kafka Consumer

Hoy publicamos en Kafka pero **nadie lee** esos mensajes dentro de nuestro backend. El consumer se suscribe a los topics, procesa cada mensaje (log, contador, etc.) y cierra el ciclo producer → bus → consumer.

**Guía técnica:** `docs/KAFKA-CONSUMER.md`

### Auto-start simulación

El enunciado pide emisión **sin intervención manual**. Implementado en `main` (PR #19): con `SIMULATION_AUTO_START=true` el backend inicia la simulación al arrancar (defaults conservadores: 4 sensores cada 10 s). Confirmar variable en Render Environment (el blueprint no siempre la aplica sola).

### 1.000 sensores y throttling → SOLO en LOCAL (Docker)

Esta es una de las partes que más confunde, así que va explicada en detalle. **La prueba de escala (1.000 sensores + throttling) se corre en local con Docker, NO en producción.** No es un atajo ni pereza: es una decisión obligada por las limitaciones de los servicios gratuitos.

#### Qué significa "1.000 sensores"

No son 1.000 sensores físicos ni 1.000 procesos. Es **demostrar que el sistema soporta ~1.000 identificadores de sensor emitiendo lecturas** hacia el pipeline (API → Mongo → Kafka → consumer), típicamente:

- Generar IDs (`SENSOR-0001` … `SENSOR-1000`) o por tipo médico
- Emitir lecturas de forma controlada (con throttling)
- Documentar el resultado (lecturas procesadas, tiempo, mensajes consumidos)

#### Qué es "throttling"

Limitar la **velocidad** de emisión para que 1.000 sensores no disparen todo al mismo tiempo y revienten el pipeline. Versión mínima aceptable:

- Intervalos escalonados entre sensores (sensor 1 a 0 ms, sensor 2 a 5 ms, …)
- Variable tipo `MAX_READINGS_PER_SECOND` o `SIMULATION_BATCH_DELAY_MS`
- Si downstream (Kafka/Mongo) va lento o falla: log + continuar o pausar, nunca acumular infinito (backpressure)

#### Por qué DEBE ser en local y no en producción

| Servicio en prod | Plan | Por qué NO aguanta 1.000 sensores |
|------------------|------|-----------------------------------|
| **Confluent Cloud** | Basic (trial) | Tiene **límites de throughput, particiones y cuota de ingesta**. Una ráfaga de 1.000 sensores puede agotar la cuota del trial, generar throttling del lado de Confluent o incluso costos. El cluster es compartido y no está dimensionado para carga de estrés. |
| **Render** | Free (512 MB RAM) | Se **duerme por inactividad**, tiene poca CPU/RAM y **un solo contenedor**. Bajo 1.000 emisiones concurrentes el proceso se satura o lo mata el OOM killer. |
| **MongoDB Atlas** | Free (M0) | ~100 conexiones y ops/s limitadas. Una prueba de escala la satura y afecta también el uso normal (P01 consultando la API). |

En cambio, **en local con Docker**:

- Kafka corre en tu contenedor (`kafka:9092`, PLAINTEXT, sin credenciales) → **sin cuotas, sin costos, sin trial que gastar**
- MongoDB local sin límite de M0
- Podés subir la carga, reventar cosas y repetir sin miedo a romper prod ni a molestar a otros grupos

#### La diferenciación local vs producción ya está en el código

El archivo `src/kafka/kafka.config.ts` **detecta automáticamente el modo** según haya credenciales o no:

| Escenario | `KAFKA_USERNAME` / `PASSWORD` | Modo | Conexión |
|-----------|------------------------------|------|----------|
| **Local (Docker)** | ausentes | `local` | `kafka:9092` PLAINTEXT, sin SSL/SASL |
| **Producción (Render)** | presentes | `cloud` | Confluent con SSL + SASL `plain` |

Es decir: **el mismo código** corre la prueba de escala contra el Kafka local (gratis, sin límites) y en prod se conecta a Confluent para el flujo normal (pocos eventos, demo funcional). No hay que cambiar código, solo el entorno donde se ejecuta.

#### Cómo separar los dos objetivos en la demo

| Objetivo | Dónde | Qué se muestra |
|----------|-------|----------------|
| **Funcionalidad end-to-end** (integración real) | **Producción** (Render + Confluent + Atlas + P09) | Swagger arriba, `POST /telemetry`, evento llega a Confluent y a P09. Volumen bajo. |
| **Escala y throttling** (1.000 sensores) | **Local** (Docker) | Simulación masiva, throttling activo, consumer contando mensajes, Mongo llenándose. Sin tocar Confluent ni Render. |

Así se cubren **ambos requisitos del enunciado** sin arriesgar la cuota del trial de Confluent ni tumbar el deploy que otros grupos están usando.

#### Qué documentar del test de escala

- Cantidad de sensores simulados (ej. 1.000)
- Configuración de throttling usada (delay, tope por segundo)
- Lecturas guardadas en Mongo (`db.sensorreadings.countDocuments()`)
- Mensajes consumidos por el consumer Kafka (contador/log)
- Duración de la corrida y si hubo errores/backpressure
- Captura o log de respaldo

---

## 10. Plan sugerido 02/07 → 08/07

### Jueves 02/07 — Alineación y arranque

- [ ] Leer este documento + `KAFKA-CONSUMER.md` todo el equipo
- [ ] `git pull origin main`
- [ ] Commitear carpeta `docs/`
- [ ] Dividir tareas (consumer / auto-start / escala)
- [ ] Probar prod: `POST /telemetry` + verificar logs P09

### Viernes 03/07 — Consumer + auto-start

- [ ] Implementar `KafkaConsumerService` (rama `feat/kafka-consumer`) → **pendiente compañero**
- [x] Implementar `SIMULATION_AUTO_START` (PR #19 mergeado)
- [x] Extender simulación hasta 1.000 sensores con IDs únicos
- [x] Throttling básico (stagger entre sensores)
- [x] Probar localmente: 1.000 lecturas en Mongo; detectado rate limit P09 (429)
- [x] Actualizar `docs/ESTADO-PROYECTO.md` y README
- [x] Pull `main` con PR #19 mergeado

### Sábado 04/07 — Consumer + evidencia escala

- [ ] `KafkaConsumerService` en local (logs + contador)
- [x] Logging específico P09/P11 (`RATE_LIMIT`, `NETWORK_ERROR`, etc.)
- [ ] Correr y documentar test 1.000 sensores (Mongo + mensajes consumer)
- [ ] Confirmar env vars simulación en Render

### Domingo 05/07 — Integración y estabilidad

- [ ] Deploy Render con env vars de simulación
- [ ] Demo integrada P09 con ≤20 sensores (respetar rate limit)
- [ ] Verificar P11 con alerta `critical`
- [ ] Coordinar P06 con compañero asignado
- [ ] Pedir confirmación a P01 sobre contrato de telemetría

### Lunes 06/07 — Buffer / deuda

- [ ] Arreglar lo que falle en prod
- [ ] Deduplicación de alertas (si da tiempo)
- [ ] Pulir README con sección "Demo de entrega"

### Martes 07/07 — Ensayo de presentación

- [ ] Ensayo completo: levantar Docker → auto-sim → ver Mongo → ver Kafka consumer → mostrar P09
- [ ] Preparar 3–5 capturas o un video corto de respaldo
- [ ] Congelar `main` salvo hotfixes

### Miércoles 08/07 — Cierre

- [ ] Solo fixes críticos
- [ ] Verificar Swagger prod, health, variables Render
- [ ] README final + este doc actualizado
- [ ] **No empezar features nuevas**

### Jueves 09/07 — Entrega

- Sin desarrollo. Presentación / demo / entrega documentación.

---

## 11. División de tareas sugerida

| Persona / rol | Tarea principal | Entregable |
|---------------|-----------------|------------|
| Compañero A | Kafka Consumer | `feat/kafka-consumer` + logs en Docker |
| Diego | Env vars Render + evidencia escala 1.000 | Deploy + docs |
| Compañero B | Integración P06 | Según contrato P06 |
| Cualquiera | Docs + README demo | Perfiles de simulación + evidencia escala |
| Coordinación | P01 | Confirmar consumo y formato telemetría |

---

## 12. Criterios de "listo para entregar"

Mínimo defendible ante cátedra:

- [x] Backend en prod accesible (Swagger OK)
- [x] Telemetría se guarda en MongoDB
- [x] Alertas automáticas funcionan
- [ ] Simulación arranca sola (auto-start activo en Render Environment)
- [x] Kafka producer publica en local
- [ ] Kafka consumer procesa mensajes en local (logs visibles)
- [ ] Test de 1.000 sensores documentado con evidencia (Mongo + consumer)
- [x] Integración P09 verificada (con rate limit 100 req/min documentado)
- [x] Integración P11 verificada (solo `critical`, HTTP 202)
- [ ] P01 confirma que `GET /sensors/*` y telemetría les sirven
- [x] README + docs actualizados (04/07 — hallazgos P09)

---

## 13. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Render free se duerme | Despertar antes de la demo; tener Docker local como plan B |
| Confluent sin permisos para crear topics | Crearlos manualmente en la consola |
| 1.000 sensores tumba Mongo local | Throttling + corrida más corta pero documentada |
| P11 front/worker lento | Solo enviamos `critical`; documentar HTTP 202 como éxito de ingesta |
| P09 rate limit / saturación | 429 → 503 → TIMEOUT bajo carga; demo ≤30 sensores; `ANALYTICS_EVENTS_ENABLED=false` en escala |
| P09 503 Service Unavailable | Respuesta de P09/Render; P08 persiste en Mongo/Kafka; documentado en README |
| Consumer no listo el 07/07 | Prioridad máxima sáb 04/07; MVP = solo `telemetry_received` |
| P02 sin contraparte | Documentar dominio médico/P01; logística fuera de alcance |

---

## 14. Archivos clave del código

```
src/
├── sensors/sensors.service.ts       # Orquesta Mongo + Kafka + P09 + alertas
├── simulation/simulation.service.ts # Generación de lecturas simuladas
├── kafka/
│   ├── kafka-producer.service.ts
│   ├── kafka.config.ts
│   └── kafka-topics.constants.ts
├── analytics/
│   ├── analytics-events.service.ts  # HTTP → P09
│   └── analytics-event.mapper.ts
├── alerts/alerts.service.ts
├── incidents/incidents-events.service.ts  # HTTP → P11
└── health/health.service.ts

docs/
├── ESTADO-PROYECTO.md    ← este archivo
└── KAFKA-CONSUMER.md     ← guía para implementar consumer

README.md                 # Documentación principal
render.yaml               # Blueprint Render
docker-compose.yml        # Stack local
```

---

## 15. Comandos útiles

```bash
# Actualizar y crear rama
git checkout main && git pull origin main
git checkout -b feat/kafka-consumer

# Local
docker compose up --build

# Build sin Docker
npm run build

# Logs Kafka en backend
docker logs iot_backend 2>&1 | findstr /i "kafka"

# Health
curl http://localhost:3000/health
```

---

## 16. Decisiones de arquitectura ya tomadas (no reabrir sin motivo)

1. **Dominio médico** (no logística) — alineado con P01.
2. **MongoDB** sigue siendo fuente de verdad para `GET /sensors/*`.
3. **Kafka interno** usa JSON plano camelCase; **P09** usa envelope snake_case.
4. **Kafka en prod** = Confluent Cloud, no Render.
5. **Demo de escala** = local con Docker, no Render free.
6. **Simulación start/stop** protegida con API key en prod.
7. **P09** se integra por HTTP, no consume Kafka directamente.
8. **Visualización y tendencias** = P09 (dashboards). P08 no tiene frontend propio.
9. **P02/logística** fuera de alcance por ausencia de equipo contraparte.
10. **P11** recibe solo alertas `critical`; las `warning` se omiten a propósito.

---

*Si actualizás algo importante, cambiá la fecha del encabezado y commiteá este archivo junto con el README.*
