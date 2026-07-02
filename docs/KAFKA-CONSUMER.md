# Guía: implementar Kafka Consumer (Proyecto 08)

Documento de contexto para quien se encargue del **consumer** de Kafka. Lee esto antes de tocar código.

---

## 1. ¿Dónde estamos?

Somos el **Proyecto 08 — Plataforma IoT** (NestJS). El backend:

1. Recibe telemetría de sensores médicos (`POST /telemetry`).
2. Guarda lecturas en **MongoDB**.
3. Evalúa umbrales y genera **alertas**.
4. Publica eventos en **Kafka** (productor).
5. Reenvía eventos a **P09** (analítica) por HTTP.

### Lo que YA funciona

| Componente | Estado |
|------------|--------|
| API REST + Swagger | ✅ |
| MongoDB (local + Atlas) | ✅ |
| Kafka **Producer** | ✅ |
| Topics en Confluent (prod) | ✅ `telemetry_received`, `alert_generated`, `sensor_offline` |
| Integración P09 (HTTP) | ✅ |
| Simulación de sensores | ✅ (protegida con `X-Simulation-Key`) |
| Deploy en Render + Confluent | ✅ |

### Lo que FALTA (tu tarea)

| Componente | Estado |
|------------|--------|
| Kafka **Consumer** | ❌ **Pendiente** |

Sin consumer, publicamos mensajes en Kafka pero **nadie en nuestro backend los lee**. Eso deja incompleto el patrón event-driven que pide el enunciado.

---

## 2. Arquitectura actual vs objetivo

### Hoy (solo producer)

```
Sensor/Simulación
      ↓
 POST /telemetry
      ↓
 SensorsService
      ├→ MongoDB (guardar)
      ├→ Kafka Producer → topics
      └→ HTTP → P09
```

### Objetivo (producer + consumer)

```
Sensor/Simulación
      ↓
 POST /telemetry
      ↓
 SensorsService
      ├→ MongoDB
      ├→ Kafka Producer → topics
      │                        ↓
      │                  Kafka Consumer  ← TU TAREA
      │                        ↓
      │                  (log / métricas / procesamiento)
      └→ HTTP → P09
```

**Importante:** el consumer **no reemplaza** MongoDB ni P09. Es una pieza adicional que demuestra que el bus de eventos funciona de punta a punta.

---

## 3. Topics y payloads

Constantes en `src/kafka/kafka-topics.constants.ts`:

| Topic | Cuándo se publica |
|-------|-------------------|
| `telemetry_received` | Cada lectura guardada |
| `alert_generated` | Cada alerta creada |
| `sensor_offline` | Lectura con `connectionStatus: "offline"` |

### Formato de mensajes (JSON en `message.value`)

Todos los eventos Kafka internos usan **camelCase** (no el envelope snake_case de P09).

**`telemetry_received`:**

```json
{
  "eventId": "uuid",
  "eventType": "telemetry_received",
  "occurredAt": "2026-07-02T20:33:44.269Z",
  "source": "iot-platform",
  "sensorId": "OXI-001",
  "assetId": "PATIENT-001",
  "sensorType": "pulse_oximeter",
  "batteryLevel": 85,
  "connectionStatus": "connected",
  "oxygenSaturation": 96,
  "heartRate": 82
}
```

**`alert_generated`:**

```json
{
  "eventId": "uuid",
  "eventType": "alert_generated",
  "occurredAt": "2026-07-02T20:33:44.269Z",
  "source": "iot-platform",
  "sensorId": "OXI-001",
  "alertType": "low_battery",
  "severity": "warning",
  "message": "Battery level is low: 15%"
}
```

**`sensor_offline`:**

```json
{
  "eventId": "uuid",
  "eventType": "sensor_offline",
  "occurredAt": "2026-07-02T20:33:44.269Z",
  "source": "iot-platform",
  "sensorId": "OXI-001",
  "assetId": "PATIENT-001",
  "sensorType": "pulse_oximeter",
  "connectionStatus": "offline"
}
```

---

## 4. Archivos que debes conocer

```
src/kafka/
├── kafka.module.ts              # Registrar producer Y consumer aquí
├── kafka-producer.service.ts    # Referencia de estilo y lifecycle
├── kafka.config.ts              # Config local vs Confluent (reutilizar)
├── kafka-topics.constants.ts    # Nombres de topics
└── interfaces/
    └── kafka-publish-result.interface.ts

src/sensors/sensors.service.ts   # Quién publica telemetría y alertas
```

**No reinventes la conexión:** usa `resolveKafkaConfig()` de `kafka.config.ts`, igual que el producer.

---

## 5. Qué implementar (MVP)

### Archivo nuevo sugerido

`src/kafka/kafka-consumer.service.ts`

### Responsabilidades mínimas

1. Implementar `OnModuleInit` y `OnModuleDestroy`.
2. Crear consumer con `kafkajs`:
   ```typescript
   const consumer = kafka.consumer({ groupId: 'iot-platform-consumer' });
   ```
3. Conectar al arrancar la app.
4. Suscribirse al menos a:
   ```typescript
   await consumer.subscribe({
     topics: [KAFKA_TOPICS.TELEMETRY_RECEIVED],
     fromBeginning: false,
   });
   ```
5. En `consumer.run({ eachMessage })`:
   - parsear JSON del `message.value`,
   - loguear evento recibido,
   - opcional: incrementar contador de mensajes procesados.

### Ejemplo orientativo (no copiar tal cual sin adaptar)

```typescript
await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const payload = JSON.parse(message.value?.toString() ?? '{}');

    this.logger.log(
      `Consumed ${topic} [partition ${partition}] sensor=${payload.sensorId ?? 'n/a'}`,
    );
  },
});
```

### Registrar en el módulo

En `kafka.module.ts`:

```typescript
providers: [KafkaProducerService, KafkaConsumerService],
exports: [KafkaProducerService, KafkaConsumerService],
```

---

## 6. Reglas importantes

### Debe hacer

- Reutilizar `resolveKafkaConfig()` (local Docker vs Confluent).
- Fallar **sin tumbar la API** si Kafka no está disponible (igual que el producer).
- Desconectar el consumer en `onModuleDestroy`.
- Usar `Logger` de NestJS.
- Probar en **local con Docker** antes de prod.

### No debe hacer

- Bloquear `POST /telemetry` si el consumer falla.
- Guardar otra vez en MongoDB desde el consumer (ya se guarda en el producer path).
- Reenviar a P09 desde el consumer (eso ya lo hace `AnalyticsEventsService`).
- Hardcodear URLs ni credenciales.

---

## 7. Variables de entorno

### Local (Docker Compose)

```env
KAFKA_BROKER=kafka:9092
# Sin KAFKA_USERNAME / KAFKA_PASSWORD → modo local
```

### Producción (Render + Confluent)

```env
KAFKA_BROKER=pkc-xxxxx.us-west-2.aws.confluent.cloud:9092
KAFKA_USERNAME=<API Key>
KAFKA_PASSWORD=<API Secret>
KAFKA_SASL_MECHANISM=plain
```

Opcional:

```env
KAFKA_CLIENT_ID=iot-platform-backend
KAFKA_CONSUMER_GROUP_ID=iot-platform-consumer
```

---

## 8. Cómo probar

### Local

```bash
docker volume create backend_sensores_mongo_data
docker compose up
```

Swagger: http://localhost:3000/docs

1. `POST /telemetry` con un ejemplo de termómetro.
2. En logs del backend deberías ver:
   ```
   Message sent to topic telemetry_received
   Consumed telemetry_received ...
   ```

### Producción

Swagger: https://iot-platform-backend-bm5b.onrender.com/docs

1. `POST /telemetry` o iniciar simulación (con `X-Simulation-Key`).
2. Revisar logs en Render → pestaña **Logs** (no Events).
3. En Confluent → topic → **Messages** (producer) y logs (consumer).

---

## 9. Criterios de aceptación

- [ ] Existe `KafkaConsumerService` registrado en `KafkaModule`.
- [ ] Se conecta con la misma config que el producer (`kafka.config.ts`).
- [ ] Consume al menos `telemetry_received`.
- [ ] Loguea cada mensaje procesado con topic y `sensorId`.
- [ ] Si Kafka falla al iniciar, la API sigue operativa.
- [ ] Funciona en local (Docker) y en prod (Confluent).
- [ ] Rama nueva + PR hacia `main` (no pushear directo a main).

### Stretch (opcional, si sobra tiempo)

- Suscribirse también a `alert_generated` y `sensor_offline`.
- Contador de mensajes consumidos (útil para prueba de 1000 sensores).
- Exponer métricas simples en un endpoint interno o en logs periódicos.

---

## 10. Flujo de trabajo Git

```bash
git checkout main
git pull origin main
git checkout -b feat/kafka-consumer
# ... implementar ...
npm run build
git add ...
git commit -m "feat: consumidor Kafka para telemetry_received"
git push -u origin feat/kafka-consumer
# Abrir PR hacia main
```

---

## 11. Preguntas frecuentes

**¿Consumer y producer en el mismo proceso?**  
Sí. En NestJS ambos pueden vivir en el mismo backend. Es lo habitual en proyectos académicos.

**¿Por qué no usamos el consumer de Confluent en vez de implementar uno?**  
El enunciado pide demostrar arquitectura event-driven en **nuestro** código.

**¿El consumer debe escribir en MongoDB?**  
No en el MVP. La telemetría ya se persiste antes de publicar a Kafka.

**¿Qué pasa si hay 2 instancias del backend?**  
Kafka reparte particiones entre consumidores del mismo `groupId`. Con una instancia en Render free, no aplica por ahora.

**¿P09 consume de Kafka?**  
No. P09 recibe eventos por HTTP (`POST /v1/events`). Kafka es nuestro bus interno.

---

## 12. Contacto / dudas

Si algo no cuadra con el código actual, revisar primero:

- `src/kafka/kafka-producer.service.ts` (patrón a seguir)
- `src/kafka/kafka.config.ts` (conexión)
- README sección Kafka y Simulación

Entrega del curso: **09/07/2026**. Prioridad: consumer funcional en local + demo en prod.
