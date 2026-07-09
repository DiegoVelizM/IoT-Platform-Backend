# Estado del Proyecto 08 — IoT Platform Backend

**Última actualización:** 09/07/2026

> La documentación del proyecto está **unificada en el [README.md](../README.md)**.  
> Este archivo solo sirve como atajo y puntero para quien busque `docs/ESTADO-PROYECTO.md`.

---

## Dónde encontrar cada cosa

| Tema | Ubicación en README |
|------|---------------------|
| Contexto P08, integraciones P01/P06/P09/P11 | [Descripción](../README.md#descripción) |
| Variables de entorno y Render | [Configuración inicial](../README.md#configuración-inicial) |
| Endpoints, simulación, Simulation Demo | [Endpoints principales](../README.md#endpoints-principales) |
| Arquitectura, Kafka, formatos de evento | [Arquitectura](../README.md#arquitectura) |
| Estado actual y pendientes | [Estado del proyecto](../README.md#estado-del-proyecto) |

## Otros documentos

| Documento | Uso |
|-----------|-----|
| [`docs/local/INFORME-PRUEBAS-ESCALA-E-INTEGRACIONES.md`](./local/INFORME-PRUEBAS-ESCALA-E-INTEGRACIONES.md) | Evidencia prueba 1.000 sensores + demo integraciones |
| [Informe E2E e integración (Google Docs)](https://docs.google.com/document/d/125Om6CwrevJw2ErB9E7fr61X0lbjzds8-uVapIaU20Q/edit?usp=sharing) | Casos de prueba manuales reproducibles |
| [`docs/AUDITORIA-FINAL-ENTREGA.md`](./AUDITORIA-FINAL-ENTREGA.md) | Revisión técnica pre-entrega |

## Resumen rápido (09/07/2026)

- Backend en producción: https://iot-platform-backend-bm5b.onrender.com/docs
- Núcleo completo: telemetría, alertas, Kafka, simulación, P09/P11/P06
- Prueba de escala documentada en `docs/local/`
- Informe E2E: [Google Docs](https://docs.google.com/document/d/125Om6CwrevJw2ErB9E7fr61X0lbjzds8-uVapIaU20Q/edit?usp=sharing)
- Pendiente principal: confirmación formal de P01 sobre contrato de consumo

Para detalle, comandos, perfiles de simulación y checklist → **README.md**.
