# Estado del Proyecto 08 — IoT Platform Backend

**Última actualización:** 02/07/2026  
**Entrega:** 09/07/2026 (sin margen ese día)  
**Ventana de trabajo efectiva:** 02/07 → 08/07 (6 días)

Documento maestro de contexto para el equipo. Si algo no cuadra con el código, revisar `main` y el README antes de este archivo.

---

## 1. Resumen ejecutivo

Somos el **Proyecto 08 — Plataforma IoT** (NestJS). El backend recibe telemetría de sensores médicos simulados, la persiste en MongoDB, genera alertas por umbrales, publica eventos en Kafka y reenvía eventos a **P09 (analítica)** por HTTP.

**El núcleo funciona y está en producción.** Lo que falta para cerrar el enunciado no es rehacer el proyecto, sino completar piezas de **arquitectura event-driven** (consumer Kafka), **automatización** (simulación sin intervención manual), **escala demostrable** (1.000 sensores + throttling en local) e **integraciones pendientes** con otros grupos.

| Métrica | Avance estimado |
|---------|-----------------|
| MVP académico (API + Mongo + alertas + Swagger + deploy) | **~85 %** |
| Entregable presentable (auto-sim + P09 + P01 + consumer + demo) | **~70 %** |
| Enunciado P08 completo (1.000 sensores, throttling, P06/P11, JWT) | **~55 %** |

**Prioridad hasta el 08/07:** consumer Kafka → auto-start simulación → escala 1.000 sensores + throttling → documentar demo → integración P11 si confirman contrato.

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
| **P01 — Salud** | Consume nuestra API | P01 → P08 | ✅ Contrato listo | `GET /sensors`, `GET /sensors/latest`, `POST /telemetry` |
| **P09 — Analítica** | Recibe eventos HTTP | P08 → P09 | ✅ Implementado | `POST /v1/events` con envelope `{ source, event_type, payload }` |
| **P11 — Incidentes** | Podría consumir alertas/eventos | P08 → P11 | ❌ Pendiente | Coordinar formato; ver sección de eventos |
| **P06 — Notificaciones** | Posible consumidor de alertas | P08 → P06 | ❓ Sin solicitud | No bloquear entrega por esto |
| **Logística** | — | — | ❌ Descartado | Sin grupo contraparte |

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
   └→ AnalyticsEventsService → HTTP P09

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

---

## 6. Avance detallado

### ✅ Implementado y mergeado en `main`

| Área | Detalle |
|------|---------|
| API REST | Telemetría, sensores, alertas, simulación, health, eventos test |
| Swagger | Documentación con errores estandarizados |
| MongoDB | Persistencia de lecturas y alertas |
| Alertas automáticas | Batería baja, offline, umbrales médicos (7 tipos) |
| Simulación | 4 sensores médicos, frecuencias configurables |
| Simulación offline | Probabilidad configurable (`SIMULATION_OFFLINE_PROBABILITY`, default 2 %) |
| Protección simulación | Header `X-Simulation-Key` en start/stop |
| Kafka Producer | Local + Confluent Cloud (`kafka.config.ts`) |
| Integración P09 | HTTP automático en telemetría y alertas |
| Manejo de errores | `HttpExceptionFilter`, códigos 400/404/500, warnings Kafka |
| Health check | Probe activo MongoDB + Kafka |
| Docker Compose | Healthchecks en todos los servicios |
| Deploy | Render + blueprint `render.yaml` |
| Documentación | README extenso |

### ⚠️ Parcial / en rama o sin commitear

| Área | Estado |
|------|--------|
| Commit `f99f213` (probabilidad offline reducida) | En `feat/simulation-offline-events`, **no en `main`** (main tiene merge PR #12 con `29ddbe3`) |
| Carpeta `docs/` | Creada localmente, **sin commitear** (`KAFKA-CONSUMER.md`, este archivo) |

### ❌ Pendiente (crítico para entrega)

| # | Tarea | Prioridad | Responsable sugerido |
|---|-------|-----------|----------------------|
| 1 | **Kafka Consumer** (`KafkaConsumerService`) | 🔴 Alta | Compañero (ver `docs/KAFKA-CONSUMER.md`) |
| 2 | **Auto-start simulación** (`SIMULATION_AUTO_START=true` al arrancar) | 🔴 Alta | Diego / quien toque simulación |
| 3 | **Escala 1.000 sensores** (generación de IDs + emisión escalonada) | 🔴 Alta | Equipo |
| 4 | **Throttling / backpressure** básico | 🔴 Alta | Equipo |
| 5 | **Demo documentada** (pasos reproducibles para el profesor) | 🟡 Media | Equipo |
| 6 | **Integración P11** (si confirman contrato) | 🟡 Media | Coordinación externa |
| 7 | Merge commit probabilidad offline + docs | 🟡 Media | Diego |
| 8 | Verificar P09 en prod tras deploy | 🟡 Media | Cualquiera |

### ❌ Pendiente (nice-to-have / post-MVP)

| Tarea | Notas |
|-------|-------|
| JWT / autenticación API | Dependencia instalada, módulo no implementado |
| Deduplicación de alertas activas | Evitar alertas repetidas del mismo tipo |
| Conectar `/events/test` a Kafka | Endpoint temporal hoy solo loguea |
| Integración P06 notificaciones | Sin solicitud del otro grupo |
| Kafka consumer en prod | Priorizar que funcione en local; prod es bonus |

---

## 7. Estado Git (02/07/2026)

### Rama principal

```
main @ c40318a — Merge PR #12 (simulation offline events)
```

### Historial reciente en `main`

| PR / commit | Qué trajo |
|-------------|-----------|
| #12 | Simulación `sensor_offline` con probabilidad configurable |
| #11 | P09 por env vars (sin URL hardcodeada) |
| — | API key en simulación start/stop |
| — | Kafka Confluent Cloud SSL/SASL |
| #10 | Integración HTTP con P09 |
| #9 | Manejo de errores HTTP/Kafka |

### Ramas locales (referencia)

Muchas ramas `feat/*` ya mergeadas. Trabajar siempre desde `main` actualizado para tareas nuevas.

### Sin commitear ahora

```
docs/          ← KAFKA-CONSUMER.md + ESTADO-PROYECTO.md
```

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
GET  /simulation/sensors?quantity=4
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

El enunciado pide emisión **sin intervención manual**. Hoy hay que llamar `POST /simulation/start`. Falta que al arrancar el backend, si `SIMULATION_AUTO_START=true`, inicie la simulación sola (respetando la API key solo en prod si aplica, o auto-start solo en local).

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

- [ ] Implementar `KafkaConsumerService` (rama `feat/kafka-consumer`)
- [ ] Implementar `SIMULATION_AUTO_START` (rama `feat/simulation-auto-start`)
- [ ] Probar en Docker: producer log + consumer log en mismo backend

### Sábado 04/07 — Escala y throttling

- [ ] Extender simulación para N sensores (hasta 1.000)
- [ ] Throttling básico (intervalos escalonados + tope configurable)
- [ ] Correr test local documentado (duración, lecturas procesadas, mensajes Kafka)

### Domingo 05/07 — Integración y estabilidad

- [ ] Merge PRs a `main`
- [ ] Deploy Render
- [ ] Confirmar con P09 que reciben eventos
- [ ] Contactar P11 si hay contrato de alertas/incidentes

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
| Compañero B / Diego | Auto-start + escala 1.000 + throttling | `feat/simulation-scale` o similar |
| Cualquiera | Docs + README demo | Sección "Cómo reproducir la demo" |
| Coordinación | P01 / P09 / P11 | Confirmar que pueden consumir/probar |

---

## 12. Criterios de "listo para entregar"

Mínimo defendible ante cátedra:

- [ ] Backend en prod accesible (Swagger OK)
- [ ] Telemetría se guarda en MongoDB
- [ ] Alertas automáticas funcionan
- [ ] Simulación arranca sola (auto-start) o está documentado el flujo manual como fallback
- [ ] Kafka producer publica en local
- [ ] Kafka consumer procesa mensajes en local (logs visibles)
- [ ] Test de 1.000 sensores ejecutado en local con throttling (aunque sea corrida corta documentada)
- [ ] Integración P09 verificada (al menos un evento en su sistema o log de ack)
- [ ] P01 puede usar `GET /sensors/*` sin clave especial
- [ ] README + docs actualizados

---

## 13. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Render free se duerme | Despertar antes de la demo; tener Docker local como plan B |
| Confluent sin permisos para crear topics | Crearlos manualmente en la consola |
| 1.000 sensores tumba Mongo local | Throttling + corrida más corta pero documentada |
| P11 no responde a tiempo | Documentar contrato propuesto (`alert_generated`) sin bloquear entrega |
| Consumer no listo el 07/07 | Prioridad máxima los días 03–04; MVP = solo `telemetry_received` |

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

---

*Si actualizás algo importante, cambiá la fecha del encabezado y commiteá este archivo junto con el README.*
