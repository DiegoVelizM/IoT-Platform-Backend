# Informe de pruebas — IoT Platform Backend (Proyecto 08)

**Documento:** Informe técnico de validación local y de integraciones  
**Proyecto:** P08 — Plataforma IoT (NestJS)  
**Fecha de ejecución de pruebas:** 09/07/2026  
**Elaborado por:** Equipo P08  
**Repositorio:** ver este archivo en `docs/local/` en GitHub para enlazar en la entrega.

> **Capturas:** puedes subir imágenes en la carpeta [`docs/local/img/`](./img/) y referenciarlas aquí con rutas relativas, por ejemplo:  
> `![Health check inicial](./img/health-inicial.png)`

---

## 1. Resumen ejecutivo

Se ejecutaron dos líneas de prueba sobre el backend IoT Platform Backend desplegado en **entorno local Docker**:

1. **Prueba de escala** con hasta **1.000 sensores simulados**, midiendo persistencia en MongoDB, procesamiento del consumer Kafka y estabilidad del sistema con integraciones externas desactivadas.
2. **Prueba de integración controlada** mediante los endpoints **Simulation Demo** en Swagger, verificando el envío correcto de eventos hacia **P11 (incidentes)** y **P06 (notificaciones por correo)**. La integración con **P09 (analítica)** se realizó por separado debido a la excesiva carga de datos a P11 y P06.

Ambas pruebas fueron satisfactorias. No se registraron errores (`ERROR`) durante la corrida de escala. Las integraciones externas respondieron según lo esperado en el ensayo demo.

---

## 2. Objetivos

| Objetivo | Descripción |
|----------|-------------|
| Escala | Demostrar que la plataforma soporta la simulación de hasta 1.000 sensores con lecturas periódicas, persistencia en MongoDB y consumo de eventos Kafka. |
| Aislamiento | Ejecutar la prueba de escala sin saturar sistemas externos (P09, P11, P06). |
| Integración | Validar de forma controlada el flujo de alertas hacia P11 y notificaciones email hacia P06. |
| Trazabilidad | Obtener métricas cuantificables (lecturas, alertas, mensajes Kafka) para evidencia de cátedra. |

---

## 3. Entorno de prueba

### 3.1 Infraestructura local (Docker Compose)

| Componente | Descripción |
|------------|-------------|
| Backend | Contenedor `iot_backend` — NestJS, puerto 3000 |
| MongoDB | Contenedor `sensores_mongo` — base `sensores_db` |
| Kafka | Contenedor `sensores_kafka` — broker local `kafka:9092` |
| Zookeeper | Contenedor `sensores_zookeeper` — coordinación de Kafka |

**Herramientas de verificación:** Swagger UI (`http://localhost:3000/docs`), endpoint `/health`, logs de Docker Desktop.

### 3.2 Configuración relevante (`.env` local)

Para la **prueba de escala**, las integraciones HTTP externas se desactivaron intencionalmente:

```env
ANALYTICS_EVENTS_ENABLED=false
INCIDENTS_ALERTS_ENABLED=false
NOTIFICATIONS_ENABLED=false
SIMULATION_AUTO_START=false
```

La simulación masiva se inició manualmente vía `POST /simulation/start` con header `X-Simulation-Key`.

**Parámetros de simulación utilizados (escala):**

| Parámetro | Valor |
|-----------|-------|
| `quantity` | 1000 |
| `frequencyMs` | 120000 (2 minutos por sensor) |
| `SIMULATION_STAGGER_MS` | 1000 (1 segundo entre arranque de cada sensor) |
| `SIMULATION_OFFLINE_PROBABILITY` | 0.05 |
| `SIMULATION_ANOMALY_PROBABILITY` | 0 |

MongoDB y Kafka del `.env` de producción (Atlas / Confluent) fueron **sobrescritos** por `docker-compose.yml` para usar la stack local.

---

## 4. Prueba de escala — 1.000 sensores

### 4.1 Procedimiento

1. Limpieza opcional de colecciones `sensorreadings` y `alerts` en MongoDB.
2. Reinicio del contenedor `backend` para resetear el contador en memoria `messagesConsumed` del consumer Kafka.
3. Captura de métricas iniciales (`GET /health`, `GET /sensors?page=1&limit=1`).
4. Inicio de simulación: `POST /simulation/start` con body `{ "quantity": 1000, "frequencyMs": 120000 }`.
5. Ejecución durante el tiempo necesario para acumular lecturas (arranque escalonado de sensores durante ~16 minutos; lecturas periódicas cada 2 minutos por sensor).
6. Captura de métricas finales y revisión de logs filtrados (ausencia de `ERROR`).

### 4.2 Resultados obtenidos

| Métrica | Valor | Fuente |
|---------|-------|--------|
| Lecturas persistidas en MongoDB | **1.023** | `GET /sensors` → campo `total` |
| Alertas registradas en MongoDB | **470** | Colección `alerts` |
| Mensajes consumidos por Kafka consumer | **1.526** | `GET /health` → `kafka.consumer.messagesConsumed` |
| Errores en logs (`ERROR`) | **0** | Logs Docker Desktop |
| Advertencias relevantes (`WARN`) | **0** (tras corrección de código) | Sin WARN de P06 en integración desactivada |

### 4.3 Interpretación del contador Kafka

El campo `messagesConsumed` **no equivale** al número de lecturas. El consumer está suscrito a tres topics:

- `telemetry_received` — una publicación por cada lectura guardada.
- `alert_generated` — una publicación por cada alerta **nueva** creada (sin duplicar alertas abiertas).
- `sensor_offline` — publicación adicional cuando un sensor pasa a estado offline.

Por tanto:

```
messagesConsumed ≈ lecturas + alertas nuevas + eventos sensor_offline adicionales
```

Con los valores medidos: **1.023 + 470 ≈ 1.493**; la diferencia hasta **1.526** (~33 mensajes) se explica por eventos `sensor_offline` publicados además de `alert_generated` en lecturas con conexión offline.

**Importante:** los eventos `alert_resolved` (cierre de alerta hacia P11) **no** se publican en Kafka y **no** incrementan este contador.

### 4.4 Comportamiento del escalonamiento (stagger)

Con 1.000 sensores y `SIMULATION_STAGGER_MS=1000`, el arranque de cada sensor se desplaza 1 segundo respecto al anterior (~16,7 minutos para activar los 1.000). En logs puede observarse que varios sensores aparecen en el mismo segundo; esto es coherente con un stagger de 1.000 ms.

### 4.5 Conclusión de la prueba de escala

La plataforma procesó más de **1.000 lecturas** con **cientos de alertas** y **más de 1.500 mensajes Kafka consumidos** sin errores fatales en el backend local. Se cumple el objetivo de evidenciar capacidad de escala simulada con persistencia y pipeline de eventos operativos.

---

## 5. Prueba de integración — Simulation Demo (Swagger)

### 5.1 Objetivo

Validar de forma **controlada** (sin simulación masiva continua) que las integraciones con **P11** y **P06** funcionan correctamente, utilizando la sección **Simulation Demo** de Swagger.

### 5.2 Endpoints utilizados

| Endpoint | Autenticación | Propósito |
|----------|---------------|-----------|
| `GET /simulation/demo/scenarios` | No requiere | Consultar catálogo de escenarios |
| `POST /simulation/demo/scenarios/{id}/run` | `X-Simulation-Key` | Ejecutar escenario predefinido |
| `POST /simulation/demo/telemetry` | `X-Simulation-Key` | Telemetría personalizada con respuesta guiada |

### 5.3 Escenarios probados (resumen)

| Escenario | Efecto esperado | Resultado |
|-----------|-----------------|-----------|
| Alerta nueva (ej. `low-battery-warning`) | `alert_generated` → P11; email → P06 | **Verificado** — incidente visible en panel P11; correo recibido en P06 |
| Recuperación (ej. `recovery-normal-reading`) | `alert_resolved` → P11 | **Verificado** — cierre de incidente en P11; sin email en P06 (comportamiento esperado) |

### 5.4 Evidencia en logs (backend)

Para alertas nuevas se observaron, entre otros:

- `Alert generated: ...`
- `Sending alert_generated to incidents API ...`
- `Incidents alert_generated acknowledged ...`
- `Notification sent for alert ...` (con P06 habilitado en Render / entorno de integración)

Para resolución:

- `Alert resolved in MongoDB: ...`
- `Notifying P11 of alert resolution: ...`
- `Incidents alert_resolved acknowledged ...`

### 5.5 Conclusión de integración demo

La integración HTTP con **P11** (apertura y cierre de incidentes) y la integración con **P06** (notificación por email en alertas `warning`/`critical`) se validaron correctamente mediante escenarios puntuales. Este flujo es el recomendado para la **demostración en cátedra**, evitando ruido en paneles externos por volumen de otros equipos.

---

## 6. Producción (Render) — notas complementarias

| Aspecto | Estado |
|---------|--------|
| URL producción | `https://iot-platform-backend-bm5b.onrender.com` |
| Swagger | `/docs` |
| Health check | `/health` (incluye estado Kafka producer y consumer) |
| Auto-start | Configurable vía `SIMULATION_AUTO_START` y variables asociadas |
| P06 en prod | `NOTIFICATIONS_ENABLED=true` — prueba manual `POST /notifications/test` exitosa (HTTP 202) |

Para la presentación ante cátedra se recomienda **Simulation Demo** en lugar de simulación masiva en producción, dado el volumen de incidentes de otros proyectos en P11.

---

## 7. Riesgos y mitigaciones observadas

| Riesgo | Mitigación aplicada |
|--------|---------------------|
| Saturación de P09/P11/P06 en escala local | Integraciones desactivadas (`*_ENABLED=false`) |
| Logs ilegibles por volumen | Métricas vía `/health` y `/sensors`; filtro ERROR/WARN |
| WARN masivos por P06 desactivado | Corrección: no invocar notificaciones si la integración está off |
| Error Kafka `CreateTopics` en reinicio | Corrección: listar topics existentes antes de crear |
| Render free tier (sleep) | Despertar servicio antes de demo; plan B Docker local |

---

## 8. Conclusiones generales

1. El backend **cumple** con el procesamiento de telemetría simulada a escala de **1.000 sensores** en entorno local, con persistencia en MongoDB y consumer Kafka operativo.
2. Las **integraciones con P11 y P06** fueron **validadas** mediante endpoints Simulation Demo, incluyendo ciclo completo de alerta y resolución.
3. La evidencia cuantitativa (1.023 lecturas, 470 alertas, 1.526 mensajes Kafka consumidos, 0 errores) sustenta el requisito de prueba de escala del enunciado.
4. Para la entrega y exposición oral, se recomienda priorizar la **demo controlada** en Swagger y documentar la **prueba de escala** como evidencia técnica complementaria.

---

## 9. Anexos — capturas de pantalla

Subir las imágenes en [`docs/local/img/`](./img/) (crear la carpeta desde GitHub o en local) y enlazarlas debajo.

| # | Descripción | Archivo sugerido |
|---|-------------|------------------|
| 1 | Health inicial (`messagesConsumed: 0`) | `img/health-inicial.png` |
| 2 | Health final (`messagesConsumed: 1526`) | `img/health-final.png` |
| 3 | Total lecturas Mongo (`total: 1023`) | `img/sensors-total.png` |
| 4 | Panel P11 — alerta creada | `img/p11-alerta.png` |
| 5 | Panel P11 — alerta resuelta | `img/p11-resuelta.png` |
| 6 | Email P06 recibido | `img/p06-email.png` |
| 7 | Swagger Simulation Demo — respuesta | `img/swagger-demo.png` |

<!-- Ejemplo tras subir imágenes:
![Health check inicial](./img/health-inicial.png)
![Health check final](./img/health-final.png)
-->

---

*Fin del informe.*
