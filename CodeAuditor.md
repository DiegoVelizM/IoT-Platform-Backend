# Análisis del Reporte de Auditoría de Código

<img width="1045" height="800" alt="image" src="https://github.com/user-attachments/assets/e467c2cc-271b-4504-bead-e31ac1446f76" />

## Resumen General

Se ejecutó la herramienta de auditoría automática sobre el backend de la plataforma IoT desarrollada con NestJS, MongoDB y Kafka.

Resultados obtenidos:

| Métrica | Puntaje |
|----------|----------|
| Performance | 84 |
| Security | 76 |
| Scalability | 68 |
| Testability | 65 |
| Code Quality | 0 |
| Maintainability | 0 |

<img width="1023" height="780" alt="image" src="https://github.com/user-attachments/assets/844b7ee9-f693-4f4d-be20-a16d4ffe1542" />

## Observaciones sobre los resultados

Si bien el auditor reporta 164 hallazgos, una revisión manual permite observar que una parte importante corresponde a:

- Archivos de pruebas (`*.spec.ts` y `*.e2e-spec.ts`).
- Recomendaciones genéricas aplicadas de forma automática.
- Posibles falsos positivos asociados al contexto tecnológico utilizado.

Por esta razón, los valores de **Code Quality** y **Maintainability** parecen estar fuertemente influenciados por hallazgos de bajo impacto funcional y por archivos que no forman parte de la lógica de negocio ejecutada en producción.

## Observación sobre los puntajes de Calidad y Mantenibilidad

Llama la atención que el auditor asigne una puntuación de 0 tanto en Code Quality como en Maintainability.

Sin embargo, el mismo reporte indica aspectos positivos relacionados con la arquitectura del sistema, la separación de responsabilidades, la gestión de dependencias y el modelado del dominio.

Además, una parte considerable de los hallazgos proviene de archivos de pruebas (`*.spec.ts`) y recomendaciones genéricas de análisis estático, por lo que estos puntajes parecen estar influenciados por criterios automatizados que no necesariamente reflejan el estado funcional ni arquitectónico real del proyecto.

Por esta razón, los resultados deben interpretarse como indicadores automáticos de mejora y no como una evaluación definitiva de la calidad global de la solución.

## Hallazgos relevantes

### 1. Observabilidad

Inicialmente se detectaron algunos bloques `try/catch` sin registro de errores.

Durante el desarrollo se incorporó logging utilizando `Logger` de NestJS en los servicios principales para facilitar el monitoreo y diagnóstico de errores.

### 2. Escalabilidad

El auditor identificó un posible patrón N+1 en `sensors.service.ts`.

Este punto fue revisado y se refactorizó la generación de alertas utilizando `Promise.all()`, permitiendo ejecutar validaciones en paralelo y reduciendo potenciales cuellos de botella.

### 3. Seguridad (XSS)

Se reportan tres riesgos XSS:

- `alerts.service.ts`
- `sensors.service.ts`
- `simulation.service.ts`

Sin embargo, el proyecto corresponde a una API REST backend desarrollada con NestJS y no realiza renderizado HTML ni manipulación del DOM.

Las detecciones parecen originarse por el uso de template strings para construir mensajes de eventos y alertas, lo que podría generar falsos positivos al aplicar reglas normalmente orientadas a aplicaciones frontend.

No obstante, se reconoce que toda entrada de usuario debe validarse adecuadamente antes de ser utilizada o almacenada.

## Hallazgos de impacto menor

La mayoría de los hallazgos restantes corresponden a:

- Magic Strings.
- Magic Numbers.
- Missing Tests.
- Excessive Nesting en archivos de pruebas.
- Dead Code detectado por análisis estático.

Algunos de estos elementos representan oportunidades de mejora para mantenibilidad y pruebas automatizadas, pero no afectan directamente el funcionamiento actual de la plataforma.

## Conclusión

La auditoría permitió identificar oportunidades de mejora relacionadas con observabilidad, escalabilidad y organización del código.

Sin embargo, una proporción importante de los hallazgos corresponde a archivos de pruebas o a reglas genéricas que no consideran completamente el contexto de una API backend basada en NestJS. Por ello, los resultados de calidad y mantenibilidad deben interpretarse con cautela y complementarse con una revisión técnica manual.

En términos funcionales, la plataforma mantiene correctamente sus capacidades principales de:

- Recepción de telemetría médica.
- Generación automática de alertas.
- Persistencia en MongoDB.
- Publicación de eventos en Kafka.
- Simulación de sensores IoT médicos.
