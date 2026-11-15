## ¿Qué cambia?
Completa los procesos de la entidad principal (**Cita**) iniciados en el Sprint 1: ahora se puede **consultar** (listado con filtros y agenda diaria) y **actualizar** (reprogramar, cancelar, atender y finalizar). Además se agregan pruebas de integración en PostgreSQL al pipeline.

## Historias de usuario
- HU-06 Cancelar cita (RF-05) · HU-07 Agenda del día (RF-04) · HU-08 Cambiar estado · HU-09 Reprogramar · HU-10 Historial del cliente

## Endpoints nuevos
| Método | Ruta | Proceso |
|---|---|---|
| GET | `/api/citas` | Consulta con filtros (fecha o rango, barbero, cliente, estado) y paginación |
| GET | `/api/agenda/:fecha` | Agenda diaria desde la vista `v_agenda_diaria` |
| PATCH | `/api/citas/:folio` | Reprogramar fecha, barbero, servicio u observaciones |
| PATCH | `/api/citas/:folio/estado` | Pendiente → En Atención → Finalizada · Pendiente → Cancelada |

## Cambios principales
- `refactor`: reglas de agenda extraídas a `services/reglas-cita.ts` y reutilizadas por el alta y la reprogramación (sin cambio de comportamiento).
- `services/permisos-cita.ts`: ciclo de estados y quién puede hacer cada cambio (funciones puras, probadas).
- UPDATE condicionado al estado leído → 409 `CITA_MODIFICADA` ante cambios simultáneos.
- El traslape al reprogramar lo sigue rechazando la restricción `EXCLUDE` de PostgreSQL (409 `HORARIO_OCUPADO`).
- Pipeline: nuevo job `base-de-datos` con `postgres:16`.

## ¿Cómo se probó?
- [x] `npm test`: 29 pruebas unitarias (15 nuevas) en verde
- [x] `db/pruebas_bd.sql`: 8 pruebas de integración en PostgreSQL 16 en verde
- [x] Pipeline de CI en verde (jobs `calidad` y `base-de-datos`)

## Notas para quien revisa
- Mientras no exista login (HU-05, pasa al Sprint 3), quien actúa viaja como `idUsuario` en el cuerpo y se valida contra la tabla `usuario`.
- Revisar sobre todo `cita-actualizacion.service.ts` → `calcularCambios()`.
