# Auditoría Entrega final — IoT Platform Backend (P08)

**Documento:** Revisión final exhaustiva antes de entrega  
**Proyecto:** P08 — Plataforma IoT (NestJS)  
**Fecha de auditoría:** 09/07/2026 (actualización pruebas E2E: 09/07/2026)  
**Alcance:** Código en `main`, tests, build, documentación y configuración de despliegue  
**Metodología:** Revisión como evaluador universitario estricto + ingeniero senior de software

**Evidencia ejecutada:**

| Verificación | Resultado |
|--------------|-----------|
| `npm test` | 67/67 tests OK (23 suites) |
| `npm run build` | OK |
| Cobertura global | 57.56 % statements · 39.32 % branches |

---

## Tabla de contenidos

1. [Corrección funcional](#1-corrección-funcional)
2. [Calidad de código](#2-calidad-de-código)
3. [Bugs y confiabilidad](#3-bugs-y-confiabilidad)
4. [Seguridad](#4-seguridad)
5. [Rendimiento](#5-rendimiento)
6. [Experiencia de usuario](#6-experiencia-de-usuario)
7. [Estructura del proyecto](#7-estructura-del-proyecto)
8. [Testing](#8-testing)
9. [Documentación](#9-documentación)
10. [Profesionalismo general](#10-profesionalismo-general)
11. [Evaluación final](#evaluación-final)

---

## 1. Corrección funcional

### Lo que sí cumple

| Requisito típico P08 | Estado | Evidencia |
|---------------------|--------|-----------|
| Ingesta REST de telemetría | ✅ | `POST /telemetry` → `SensorsService.create` |
| Persistencia MongoDB | ✅ | `src/sensors/schemas/sensor-reading.schema.ts` |
| Alertas por umbrales | ✅ | `src/sensors/sensors.service.ts` |
| Kafka productor | ✅ | Topics `telemetry_received`, `alert_generated`, `sensor_offline` |
| Consumer Kafka | ⚠️ Parcial | Conecta y cuenta mensajes; no procesa lógica de negocio |
| Simulación (hasta 1000 sensores) | ✅ | `src/simulation/simulation.service.ts` |
| Integraciones P09/P11/P06 | ✅ | Módulos HTTP con reintentos y filtros |
| Swagger + deploy | ✅ | `/docs`, `render.yaml`, Docker |
| Prueba de escala documentada | ✅ | `docs/local/INFORME-PRUEBAS-ESCALA-E-INTEGRACIONES.md` |
| Retención de lecturas | ✅ | TTL index (`READINGS_TTL_DAYS`, default 7 días) |
| Agregación dispositivos | ✅ | `aggregate` en `sensors.service.ts` |

### Funcionalidad faltante o incompleta

#### 1. Consumer Kafka es un stub

**Archivo:** `src/kafka/kafka-consumer.service.ts`

Solo hace `JSON.parse`, incrementa contador y loguea. Si el enunciado exige un pipeline event-driven real, esto está incompleto.

#### 2. `assetId` no llega a P06 en flujo automático

**Archivo:** `src/alerts/alerts.service.ts` (línea ~85)

Se lee `assetId` del documento `Alert`, pero el schema de alerta no tiene ese campo. Siempre será `undefined` en notificaciones automáticas, aunque P11 sí lo recibe vía `analyticsContext`.

#### 3. Resolución de alertas — comportamiento esperado vs. lecturas parciales

**Severidad:** Baja (nota de diseño, no bug del flujo principal)  
**Archivo:** `src/sensors/sensors.service.ts`

**Comportamiento implementado (flujo normal):** cuando una lectura incluye un campo **presente y dentro de rango**, la alerta correspondiente se resuelve automáticamente (`resolveOpenAlert`). Esto aplica a simulación, Swagger, demo `recovery-normal-reading` y cualquier cliente que envíe lecturas completas — que es el contrato previsto con P01 y los sensores simulados.

| Campo en la lectura | Fuera de rango | Dentro de rango |
|--------------------|----------------|-----------------|
| `batteryLevel` | Crea `low_battery` | Resuelve `low_battery` |
| `glucoseLevel`, `temperature`, SpO₂, FC, presión | Crea alerta del tipo | Resuelve alerta del tipo |
| `connectionStatus: "connected"` | — | Resuelve `sensor_offline` |

**Caso borde (solo lecturas incompletas):** si un campo **no viene en el JSON** (`undefined`), ese check hace `return` sin crear ni resolver. Ejemplo: enviar solo glucosa normal no cierra `low_battery` abierta, porque `batteryLevel` no se evaluó — no porque el valor esté mal.

```http
POST /telemetry
{ "sensorId": "GLUCO-001", "sensorType": "glucometer", "assetId": "PATIENT-001", "glucoseLevel": 95 }
```

→ Resuelve `glucose_out_of_range` si estaba abierta; **no toca** `low_battery` ni `sensor_offline` (campos omitidos).

**Recomendación para integradores:** incluir en cada lectura los campos del sensor (`batteryLevel`, `connectionStatus` y la métrica clínica). La simulación y los escenarios demo ya lo hacen así. Detalle ampliado en el README, sección de cierre de incidentes.

#### 4. Sin escalado de severidad en deduplicación

**Archivo:** `src/alerts/alerts.service.ts` (líneas 46–50)

Si existe alerta `low_battery` **warning** y llega batería **critical**, devuelve la existente sin actualizar severidad ni re-notificar.

#### 5. `sensor_offline` en Kafka se emite aunque la alerta se deduplica

**Archivo:** `src/sensors/sensors.service.ts` (líneas 139–165)

`alertsService.create` puede no crear alerta nueva, pero Kafka siempre publica `sensor_offline`.

#### 6. `alert_resolved` no se publica a Kafka

`EventType.ALERT_RESOLVED` existe en `src/common/events/event-types.ts` pero no se usa en el productor. Consumidores Kafka no ven resoluciones.

#### 7. Fallos P09/P11 invisibles en la API

Son fire-and-forget (`void`). Solo fallos de Kafka aparecen como `warnings` en la respuesta de telemetría. Los códigos `ANALYTICS_PUBLISH_FAILED` / `INCIDENTS_PUBLISH_FAILED` están definidos pero no se usan en respuestas HTTP.

#### 8. Umbrales médicos asimétricos

Hay alerta de presión alta, no de hipotensión. Aceptable si está documentado como decisión de dominio (sí, es así).

#### 9. Escenarios demo incompletos para todos los sensores

`recovery-normal-reading` usa `OXI-001` por defecto; no resuelve alertas de `THERMO-001`, `GLUCO-001`, etc. sin override de `sensorId`.

---

## 2. Calidad de código

### Fortalezas

- Arquitectura NestJS modular clara (`sensors`, `alerts`, `kafka`, `simulation`, integraciones separadas).
- DTOs con `class-validator` + `ValidationPipe` global estricto (`whitelist`, `forbidNonWhitelisted`).
- Filtro de errores centralizado (`src/common/filters/http-exception.filter.ts`).
- Códigos de error estandarizados (`src/common/errors/error-codes.ts`).
- Integraciones desacopladas (fire-and-forget donde corresponde).
- Constantes de umbrales extraídas (`src/sensors/constants/sensor-thresholds.constants.ts`).

### Code smells detectados

| Problema | Ubicación | Impacto |
|----------|-----------|---------|
| Patrón TOCTOU en dedup | `src/alerts/alerts.service.ts:38-54` | Duplicados bajo concurrencia |
| `createMany` muerto | `src/alerts/alerts.service.ts` | Código sin uso, sin dedup ni integraciones |
| Cast inseguro `as unknown as { assetId? }` | `src/alerts/alerts.service.ts:85` | Bug silencioso |
| `setInterval` sin await | `src/simulation/simulation.service.ts:82-85` | Lecturas solapadas bajo carga |
| Inferencia de tipo por substring en IDs | `src/simulation/simulation.service.ts` | IDs custom mal clasificados |
| Specs de controladores = smoke | `*.controller.spec.ts` | Falsa sensación de cobertura |
| README muy largo | `README.md` | Fuente única de verdad; `ESTADO-PROYECTO.md` reducido a índice |

No hay sobre-abstracción grave; el proyecto sigue KISS razonablemente bien para un MVP académico.

---

## 3. Bugs y confiabilidad

### Críticos / altos

**Condición de carrera en alertas**

Dos `POST /telemetry` concurrentes del mismo sensor/tipo pueden crear dos alertas abiertas. El índice en `src/alerts/schemas/alert.schema.ts` no es único.

**Múltiples alertas abiertas → resolución parcial**

`resolveOpenAlert` usa `findOne` sin `sort`; si hay duplicados, solo resuelve una.

**Simulación con 1000 sensores + `frequencyMs` bajo**

`setInterval` no espera `create()`; con Mongo lento o `frequencyMs: 1000`, se amplifica la carrera y el desorden de timestamps.

### Medios

- `src/kafka/kafka-producer.service.ts`: reconexiones concurrentes sin mutex.
- `ensureTopics` silencia fallos → primer `emit` puede fallar sin que el arranque falle.
- Health check: consumer caído no degrada status (comportamiento documentado en `health.service.spec.ts`).
- `findBySensor` devuelve **404** cuando `total === 0` — semánticamente es "sin historial", no "recurso inexistente".
- `SimulationApiKeyGuard`: clave no configurada → **503** con código `SIMULATION_UNAUTHORIZED` (HTTP confuso).

### Reproducción teórica (race)

```bash
POST /simulation/start  { "quantity": 100, "frequencyMs": 1000 }
# + SIMULATION_ANOMALY_PROBABILITY alto
# → revisar alertas duplicadas en Mongo para mismo sensorId+type
```

---

## 4. Seguridad

| Hallazgo | Severidad | Detalle |
|----------|-----------|---------|
| `POST /telemetry` sin autenticación | **Crítico** (prod) / **Aceptable** (demo P01) | Cualquiera inyecta telemetría → alertas, Kafka, P11, P06 |
| `GET /sensors`, `GET /alerts` públicos | **Alto** | Exposición de datos médicos simulados |
| CORS abierto si falta `CORS_ORIGIN` | **Alto** | `src/main.ts:24-25` → `enableCors()` sin restricción |
| `SIMULATION_AUTO_START=true` en Render | **Alto** | `render.yaml:43-44` — carga continua sin API key |
| Swagger `/docs` público | **Medio** | Facilita reconocimiento y abuso |
| `/health` expone broker Kafka, groupId, errores | **Medio** | `src/health/health.service.ts` |
| JWT en deps pero no implementado | **Medio** | `package.json` + `render.yaml` generan `JWT_SECRET` sin uso |
| API keys con `!==` (no timing-safe) | **Medio** | `internal-api-key.guard.ts`, `simulation-api-key.guard.ts` |
| Sin rate limiting / helmet | **Medio** | DoS por volumen de telemetría |
| Strings sin `MaxLength` en DTOs | **Medio** | DoS por payloads enormes |
| Posible API key en test | **Bajo** | `src/notifications/tests/notifications.spec.ts` — verificar si es real |
| Mongo/Kafka sin auth en Docker local | **Bajo** (local) | `docker-compose.yml` puertos expuestos |
| `.env` en `.gitignore` | ✅ Positivo | No commiteado |

**Nota contextual:** Si P01 consume `POST /telemetry` sin auth por contrato de integración, documentar esa decisión explícitamente en README/entrega.

---

## 5. Rendimiento

### Lo probado (documentado)

Informe local: **1000 sensores**, `frequencyMs: 120000`, integraciones off → **1023 lecturas**, **470 alertas**, **1526 mensajes Kafka**, 0 ERROR.

Ver: [`docs/local/INFORME-PRUEBAS-ESCALA-E-INTEGRACIONES.md`](./local/INFORME-PRUEBAS-ESCALA-E-INTEGRACIONES.md)

### Limitaciones identificadas

| Área | Riesgo |
|------|--------|
| P09 con analytics ON + alta frecuencia | Rate limit 429 documentado en README |
| `Promise.all` en checks de alertas | Una lectura anómala dispara múltiples integraciones en paralelo |
| Sin índice único en alertas abiertas | Duplicados = más escrituras y notificaciones |
| Plan free Render | Cold starts, memoria limitada |
| Paginación max 100 | ✅ Mitiga consultas enormes |

**Escalabilidad estimada:** Con integraciones desactivadas, 1000 sensores cada 2 min es viable localmente. Con P09/P11/P06 activos a esa escala, degradación esperada (ya documentada). Para producción real necesitaría colas, backpressure y rate limiting en integraciones.

---

## 6. Experiencia de usuario

Backend sin frontend — UX = **API + Swagger + logs**.

| Aspecto | Evaluación |
|---------|------------|
| Swagger en `/docs` | Muy bueno — ejemplos por tipo de sensor, demo scenarios |
| Mensajes de error estructurados | Bueno — `statusCode`, `error`, `message`, `timestamp`, `path` |
| Warnings de Kafka en respuesta | Bueno — el cliente sabe si hubo fallo parcial |
| `POST /simulation/start` si ya corre | Confuso — 200 informativo sin indicar cómo reiniciar |
| Demo hint siempre dice "Alert generated" | Engañoso si hubo dedup |
| Sin UI de monitoreo propia | OK si P09 cubre dashboards (documentado) |

**Mejoras prácticas:** documentar `/simulation/demo/*` en README; añadir ejemplos curl en informe; proteger o deshabilitar `POST /events/test` en prod.

---

## 7. Estructura del proyecto

```
src/
├── alerts/          ✅
├── sensors/         ✅ núcleo
├── telemetry/       ✅ thin controller
├── kafka/           ✅
├── simulation/      ✅ incluye demo
├── notifications/   ✅ P06
├── incidents/       ✅ P11
├── analytics/       ✅ P09
├── health/          ✅
└── common/          ✅ guards, filters, DTOs
```

**Bien organizado** para NestJS. Sin `.github/workflows` (sin CI). `docker-compose.yml` + `Dockerfile` + `render.yaml` coherentes.

Complejidad innecesaria: mínima. Dependencias JWT/bcrypt instaladas sin uso — ruido en `package.json`.

---

## 8. Testing

| Métrica | Valor |
|---------|-------|
| Test suites (unitarios) | 23 passed |
| Tests unitarios | 67 passed |
| Cobertura statements | **57.56 %** |
| Cobertura branches | **39.32 %** |
| E2E automatizado en repo | `test/app.e2e-spec.ts` — smoke `GET /` |
| E2E / integración documentados | [Informe E2E (Google Docs)](https://docs.google.com/document/d/125Om6CwrevJw2ErB9E7fr61X0lbjzds8-uVapIaU20Q/edit?usp=sharing) + [`INFORME-PRUEBAS-ESCALA-E-INTEGRACIONES.md`](./local/INFORME-PRUEBAS-ESCALA-E-INTEGRACIONES.md) |

### Estrategia de pruebas (estado actual)

El proyecto combina **tests automatizados en el repo** con **evidencia E2E e integración documentada** para la entrega:

| Capa | Qué cubre | Dónde |
|------|-----------|--------|
| Unitarios | Umbrales, alertas, dedup, Kafka setup, demo scenarios, guards, P06 (mock) | `src/**/*.spec.ts` |
| E2E automatizado | Arranque de `AppModule` y endpoint raíz | `test/app.e2e-spec.ts` |
| E2E manual / integración | Telemetría, health, simulación, Simulation Demo, P09/P11/P06 en Render y Docker | [Informe E2E (Google Docs)](https://docs.google.com/document/d/125Om6CwrevJw2ErB9E7fr61X0lbjzds8-uVapIaU20Q/edit?usp=sharing) |
| Escala | 1.000 sensores, Mongo, Kafka consumer | [`docs/local/INFORME-PRUEBAS-ESCALA-E-INTEGRACIONES.md`](./local/INFORME-PRUEBAS-ESCALA-E-INTEGRACIONES.md) + capturas en `docs/local/img/` |

Los casos E2E de negocio (p. ej. `POST /telemetry` → persistencia + alerta, demo P11/P06) **no están ausentes**: se documentan en el [informe E2E (Google Docs)](https://docs.google.com/document/d/125Om6CwrevJw2ErB9E7fr61X0lbjzds8-uVapIaU20Q/edit?usp=sharing) con pasos reproducibles, capturas y resultados esperados. El repo prioriza unitarios + smoke E2E; ampliar `test/*.e2e-spec.ts` queda como mejora opcional post-entrega.

### Bien cubierto (automatizado)

- `src/sensors/sensors.service.spec.ts` — umbrales, Kafka, paginación, regex
- `src/alerts/alerts.service.spec.ts` — dedup, resolución, P11
- `src/notifications/tests/notifications.spec.ts` — reintentos + persistencia de fallos
- Guards, filtros, demo scenarios, Kafka topic setup

### Sin tests automatizados (brecha en repo, no en entrega)

- `src/kafka/kafka-producer.service.ts`
- `src/analytics/analytics-events.service.ts`
- `src/incidents/incidents-events.service.ts`
- E2E automatizado de `POST /telemetry`, `/health`, `/simulation/demo` (cubierto en [informe E2E Google Docs](https://docs.google.com/document/d/125Om6CwrevJw2ErB9E7fr61X0lbjzds8-uVapIaU20Q/edit?usp=sharing))

### Mejoras opcionales (post-entrega)

1. Automatizar en `test/*.e2e-spec.ts` los casos ya descritos en el informe Google Docs.
2. Unit: dedup concurrente (dos `create` paralelos mismo sensor/tipo).
3. Unit: `sensor_offline` no emite Kafka si alerta deduplicada.
4. Unit: `assetId` propagado a P06 desde `analyticsContext`.
5. Integration mock: P11 `publishResolved` tras recovery demo.

---

## 9. Documentación

### Fortalezas

- README extenso: setup Docker, variables, endpoints, integraciones, errores.
- Swagger operativo en `/docs`.
- README como documentación principal unificada; `ESTADO-PROYECTO.md` es índice breve.
- `docs/local/INFORME-PRUEBAS-ESCALA-E-INTEGRACIONES.md` — evidencia cuantitativa de escala e integraciones.
- [**Informe E2E e integración (Google Docs)**](https://docs.google.com/document/d/125Om6CwrevJw2ErB9E7fr61X0lbjzds8-uVapIaU20Q/edit?usp=sharing) — casos manuales reproducibles (telemetría, health, demo, P09/P11/P06).

### Brechas

| Brecha | Impacto |
|--------|---------|
| `JWT_SECRET` en README/render pero no en `.env.example` | Inconsistencia |
| `SIMULATION_ANOMALY_PROBABILITY` poco documentada en README | — |
| Sin CI/CD documentado | — |
| Licencia `UNLICENSED` sin aclaración | — |
| Decisiones de seguridad (telemetry pública) no justificadas | Pregunta probable en defensa |

---

## 10. Profesionalismo general

**Por encima del promedio universitario en:**

- Arquitectura modular
- Integraciones reales con equipos externos
- Manejo de errores estandarizado
- Deploy en Render + Docker
- Prueba de escala documentada
- Simulation Demo para cátedra

**Por debajo del estándar profesional en:**

- Autenticación
- Automatización E2E en repo (limitada; evidencia manual en Google Docs)
- CI/CD
- Hardening de producción
- Consumer Kafka funcional

---

# Evaluación final

## Executive Summary

Proyecto **sólido y entregable** para Ingeniería de Software universitaria. El núcleo funciona, está desplegado, integra con P01/P06/P09/P11, tiene Swagger, pruebas unitarias razonables, evidencia de escala con 1000 sensores e **informes E2E/integración** (Google Docs + `docs/local/`).

Los problemas más serios son de **seguridad por diseño abierto** (aceptable si se defiende como contrato IoT), **bugs de concurrencia en alertas**, **consumer Kafka incompleto** y **cobertura unitaria media** (E2E de negocio documentado fuera del repo).

No está listo para producción real sin auth, rate limiting y hardening.

---

## Critical Issues

Issues que conviene abordar antes de entregar si hay tiempo:

1. **Documentar explícitamente** por qué `POST /telemetry` es público (contrato P01) o añadir API key de dispositivo.
2. **Corregir `assetId` en P06** — pasar desde `analyticsContext` o persistir en `Alert`.
3. **Condicionar emisión Kafka `sensor_offline`** a alerta realmente nueva.
---

## Important Improvements

1. Índice único parcial en alertas abiertas + operación atómica.
2. Escalado de severidad en alertas existentes.
3. Obligar `CORS_ORIGIN` en producción.
4. Mantener desactivada `SIMULATION_AUTO_START` en Render (como ya está actualmente) salvo demos.
5. Implementar lógica real en consumer Kafka o documentar que es solo contador/observabilidad.
6. Warnings HTTP cuando P09/P11 fallen (opcional pero profesional).
7. *(Opcional post-entrega)* Automatizar casos del informe E2E en `test/*.e2e-spec.ts`.

---

## Minor Suggestions

- `crypto.timingSafeEqual` en guards de API key.
- `MaxLength` en `sensorId`, `message`, `assetId`.
- Eliminar o proteger `POST /events/test` en prod.
- Quitar deps JWT si no se usarán, o implementar auth básica.
- CI con `npm test` + `npm run build` en GitHub Actions.
- *(Hecho)* README unificado como fuente única; `ESTADO-PROYECTO.md` reducido a índice.
- Proteger `GET /simulation/demo/scenarios` o documentarlo como catálogo público.
- Aclarar en contrato P01 que lecturas parciales solo evalúan los campos enviados (ya documentado en README).

---

## Overall Grades

Calificaciones de 1 a 10:

| Criterio | Nota | Justificación |
|----------|------|---------------|
| Corrección funcional | **8** | Núcleo completo; consumer stub, dedup bajo concurrencia, P06 sin assetId |
| Calidad de código | **7.5** | Modular y legible; races, código muerto, casts frágiles |
| Arquitectura | **8** | Event-driven bien planteado; consumer incompleto |
| Seguridad | **5** | Sin auth en endpoints principales; aceptable en contexto académico si se documenta |
| Mantenibilidad | **7.5** | Buena estructura; README como fuente única |
| Rendimiento | **7.5** | Escala 1000 probada con aislamiento; integraciones saturan P09 |
| Testing | **7.5** | 67 tests unitarios, 57 % cov; E2E/integración documentados (Google Docs + informe escala) |
| Documentación | **8.5** | README + Swagger + informes locales + informe E2E en Google Docs |
| **Calidad global** | **7.8** | MVP académico muy completo con evidencia de pruebas documentada |

---

## If This Were My Project...

Las cinco mejoras que haría primero, en orden de prioridad:

1. **Corregir bug `assetId` → P06** y condicionar Kafka `sensor_offline` (impacto visible en demo).
2. **Documentar decisiones de seguridad** (telemetry abierta por P01, integraciones protegidas por API key).
3. Automatizar en CI los casos críticos del [informe E2E](https://docs.google.com/document/d/125Om6CwrevJw2ErB9E7fr61X0lbjzds8-uVapIaU20Q/edit?usp=sharing) (opcional).

---

## Final Verdict

### 1. ¿Nota alta en curso universitario?

**Sí, probablemente.** Cumple el espíritu del enunciado P08: backend IoT, Mongo, Kafka, alertas, simulación, integraciones reales, deploy, Swagger, evidencia de escala. Los profesores suelen valorar integración entre equipos y demo funcional. Los puntos débiles (seguridad, consumer stub) se mitigan si se explican en defensa oral y se muestra documentación/auditoría + demo en vivo.

### 2. ¿Aprobar para producción?

**No.** Falta autenticación en ingesta, rate limiting, hardening CORS, observabilidad de integraciones, manejo de concurrencia en alertas, y el consumer Kafka no aporta valor operativo. Aceptable como **MVP/demo**, no como sistema clínico real.

### 3. Mayor debilidad

**Consistencia del pipeline de alertas bajo concurrencia** (dedup no atómica, Kafka `sensor_offline` redundante, `assetId` perdido en P06). La resolución automática al volver a valores normales **sí funciona** en el flujo de lecturas completas.

### 4. Mayor fortaleza

**Arquitectura integrada end-to-end con evidencia real**: telemetría → Mongo → alertas → Kafka → P09/P11/P06, con Simulation Demo, prueba de 1000 sensores documentada y deploy en Render. Demuestra trabajo de equipo e ingeniería aplicada.

### 5. Calificación con letra

**B+ / A-** (aprox. **87–90 %**)

- **A** si la defensa muestra informes (escala + E2E Google Docs) con capturas y se explican las decisiones de seguridad.
- **B+** si el profesor penaliza fuerte consumer Kafka stub o bugs de dedup sin mencionar.
- **No bajaría a B** salvo que falte evidencia de escala o integraciones rotas en demo.

## Documentos relacionados

| Documento | Descripción |
|-----------|-------------|
| [`INFORME-PRUEBAS-ESCALA-E-INTEGRACIONES.md`](./local/INFORME-PRUEBAS-ESCALA-E-INTEGRACIONES.md) | Evidencia cuantitativa de prueba con 1000 sensores + demo P11/P06 |
| [Informe E2E e integración (Google Docs)](https://docs.google.com/document/d/125Om6CwrevJw2ErB9E7fr61X0lbjzds8-uVapIaU20Q/edit?usp=sharing) | Casos manuales reproducibles (telemetría, health, demo, integraciones) |
| [`ESTADO-PROYECTO.md`](./ESTADO-PROYECTO.md) | Índice breve → apunta al README |
| [`README.md`](../README.md) | Documentación principal del proyecto |
