# BarberControl v1.1 | Actividad 11.1 | Backlog priorizado

**Equipo:** Martínez Mota Diana Angélica (22540267) · Eduardo Guevara Ruiz (23540259)
**Sprint 1:** 1 semana · **Meta del sprint:** *"Un cliente puede registrarse, ver los servicios y agendar una cita que la base de datos protege contra traslapes."*

> Las historias derivan de los casos de uso del sistema (roles Cliente, Barbero y Administrador) y de los requisitos RF-03, RF-04 y RF-05 de la Actividad 7.1. Ajustar los códigos HU/CU a la numeración del documento de casos de uso del equipo.

## 1. Backlog completo (ordenado por prioridad)

| Prioridad | ID | Historia de usuario | Rol | Puntos | Sprint |
|:-:|---|---|---|:-:|:-:|
| 1 | HU-01 | Como **cliente** quiero registrarme con mis datos para poder agendar citas. | Cliente | 3 | **1** |
| 2 | HU-02 | Como **cliente** quiero ver los servicios con duración y precio para elegir el que necesito. | Cliente | 2 | **1** |
| 3 | HU-03 | Como **cliente** quiero agendar una cita con un barbero, servicio, fecha y hora para asegurar mi lugar (RF-03). | Cliente | 8 | **1** |
| 4 | HU-04 | Como **cliente** quiero consultar mi cita por folio para confirmar los datos. | Cliente | 2 | **1** |
| 5 | HU-05 | Como **usuario** quiero iniciar sesión para que el sistema sepa quién soy (bcrypt + token). | Todos | 5 | 2 |
| 6 | HU-06 | Como **cliente** quiero cancelar mi cita para liberar el horario (RF-05). | Cliente | 3 | 2 |
| 7 | HU-07 | Como **barbero** quiero ver mi agenda del día (RF-04, vista `v_agenda_diaria`). | Barbero | 3 | 2 |
| 8 | HU-08 | Como **barbero** quiero cambiar el estado de una cita (En Atención / Finalizada). | Barbero | 3 | 2 |
| 9 | HU-09 | Como **cliente** quiero reprogramar mi cita a otro horario libre. | Cliente | 5 | 3 |
| 10 | HU-10 | Como **cliente** quiero ver el historial de mis citas. | Cliente | 2 | 3 |
| 11 | HU-11 | Como **administrador** quiero registrar el pago de una cita (efectivo o transferencia). | Admin | 5 | 3 |
| 12 | HU-12 | Como **administrador** quiero gestionar el catálogo de servicios. | Admin | 5 | 3 |
| 13 | HU-13 | Como **administrador** quiero gestionar horarios y bloqueos de agenda de los barberos. | Admin | 5 | 4 |
| 14 | HU-14 | Como **administrador** quiero reportes de citas e ingresos por periodo. | Admin | 8 | 4 |

**Criterio de priorización:** primero lo que habilita el flujo principal del negocio (registrarse → ver servicios → agendar → consultar), después lo que depende de saber *quién* es el usuario (login) y al final administración y reportes.

## 2. Sprint 1 seleccionado (15 puntos)

| ID | Tarea técnica | Criterios de aceptación | Estado |
|---|---|---|:-:|
| HU-01 | `POST /api/clientes`: validar datos, cifrar contraseña con bcrypt, guardar con rol Cliente. | Responde 201 sin `passwordHash`; correo repetido → 409; sin aviso de privacidad → 400. | Hecho |
| HU-02 | `GET /api/servicios`: lista de servicios activos. | Devuelve nombre, duración y precio; excluye inactivos. | Hecho |
| HU-03 | `POST /api/citas`: **proceso de alta de la entidad principal**. Validar formato, cliente/servicio/barbero, que el barbero ofrezca el servicio, fecha futura en bloques de 15 min, dentro de su horario y sin bloqueo; guardar en transacción. | 201 con folio generado por la BD; traslape → 409 (RF-03); fuera de horario / agenda bloqueada / fecha pasada → 422; datos mal formados → 400 con todos los errores. | Hecho |
| HU-04 | `GET /api/citas/:folio` con manejo de error uniforme. | 200 con cliente, barbero, servicio, estado e historial; folio inexistente → 404. | Hecho |

**Fuera del sprint (decisión consciente):** inicio de sesión. Mientras no exista, `POST /api/citas` recibe `idCliente` en el cuerpo; en HU-05 saldrá del token.

## 3. Definición de "hecho" usada
- Cumple los criterios de aceptación de la tabla.
- Funciones pequeñas con nombre que dice lo que hacen; sin lógica de negocio en controladores ni acceso a BD en validadores.
- Reglas puras con pruebas automáticas (`npm test`).
- Documentado en el README con ejemplo de petición.
