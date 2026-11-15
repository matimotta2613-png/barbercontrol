# BarberControl v1.2 | Actividad 12.1 | Sprint 2

**Equipo:** Martínez Mota Diana Angélica (22540267) · Eduardo Guevara Ruiz (23540259)
**Sprint 2:** 1 semana · **Meta:** *"El equipo trabaja con ramas, pull requests y un pipeline que valida cada cambio; el cliente puede consultar, reprogramar y cancelar sus citas y el barbero puede atenderlas."*

## 1. Historias seleccionadas

| ID | Historia | Proceso | Puntos | Estado |
|---|---|---|:-:|:-:|
| HU-06 | Como **cliente** quiero cancelar mi cita para liberar el horario (RF-05). | Actualización | 3 | Hecho |
| HU-07 | Como **barbero** quiero ver la agenda del día (RF-04, `v_agenda_diaria`). | Consulta | 3 | Hecho |
| HU-08 | Como **barbero** quiero marcar una cita En Atención / Finalizada. | Actualización | 3 | Hecho |
| HU-09 | Como **cliente** quiero reprogramar mi cita a otro horario libre. | Actualización | 5 | Hecho |
| HU-10 | Como **cliente** quiero ver el historial de mis citas (listado filtrado por cliente). | Consulta | 2 | Hecho |
| TEC-01 | Repositorio en GitHub, rama por funcionalidad y pull request de integración. | Flujo de trabajo | 2 | Hecho |
| TEC-02 | Pipeline de CI: validación del esquema, tipos, pruebas unitarias y de BD. | Integración continua | 3 | Hecho |

**Cambio respecto al plan del Sprint 1:** HU-05 (inicio de sesión) se movió al Sprint 3 para dar prioridad a los procesos de actualización y consulta que pide la Actividad 12.1. Se mantiene la solución temporal: `idUsuario` en el cuerpo, ahora validado contra la tabla `usuario` y con reglas de permiso por rol.

## 2. Criterios de aceptación

| ID | Criterio | Cómo se comprueba |
|---|---|---|
| HU-06 | Solo el cliente dueño o el administrador cancelan; solo citas Pendientes; el horario queda libre. | `permisos-cita.test.ts` · prueba BD 7 |
| HU-07 | `GET /api/agenda/:fecha` ordenada por hora, sin canceladas salvo que se pidan. | prueba BD 8 |
| HU-08 | Solo el barbero asignado o el administrador; Pendiente → En Atención → Finalizada; la bitácora guarda quién lo hizo. | `permisos-cita.test.ts` · prueba BD 6 |
| HU-09 | Solo citas Pendientes; mismas reglas que el alta; traslape → 409; si cambia el servicio se copian duración y precio vigentes. | pruebas BD 1–5 · `actualizacion-consulta.test.ts` |
| HU-10 | `GET /api/citas` con filtros combinables, paginación y total; parámetros inválidos → 400 con todos los errores. | `actualizacion-consulta.test.ts` · prueba BD 8 |
| TEC-01 | Rama `feature/sprint2-actualizacion-consulta` integrada a `main` mediante PR revisado. | Historial de GitHub |
| TEC-02 | El PR no se integra si el pipeline está en rojo. | Pestaña *Actions* / *Checks* del PR |

## 3. Decisiones técnicas
- **Las reglas de agenda se extrajeron** (`reglas-cita.ts`) para que reprogramar aplique exactamente lo mismo que agendar, sin duplicar código.
- **UPDATE condicionado al estado leído** (`WHERE id_estado = ...`): si dos personas cambian la misma cita a la vez, la segunda recibe 409 `CITA_MODIFICADA` en lugar de sobrescribir.
- **El traslape lo sigue decidiendo PostgreSQL**: la restricción `EXCLUDE` también actúa en `UPDATE`, así que la reprogramación no necesita revisar citas por su cuenta.
- **Pruebas de BD en SQL puro** dentro de una transacción con `ROLLBACK`: corren en CI con un contenedor `postgres:16` y no ensucian la base local.
