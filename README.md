# BarberControl v1.2 — Sprint 2 (Actividad 12.1)

![CI](https://github.com/USUARIO/barbercontrol/actions/workflows/ci.yml/badge.svg)

Sistema web de citas para **BarberControl Studio**.
Node.js + TypeScript + Express + Prisma ORM + PostgreSQL 16 (base de datos de la Actividad 7.1).

**Equipo:** Martínez Mota Diana Angélica (22540267) · Eduardo Guevara Ruiz (23540259)

| Sprint | Procesos de la entidad principal (Cita) |
|---|---|
| 1 (Act. 11.1) | Registro de cliente · **alta** de cita · consulta por folio |
| 2 (Act. 12.1) | **Actualización** (reprogramar, cancelar, atender, finalizar) · **consulta** (listado con filtros, agenda diaria) · repositorio con ramas, pull request y CI |

Documentos: [`docs/BACKLOG_SPRINT2.md`](docs/BACKLOG_SPRINT2.md) · [`docs/FLUJO_DE_TRABAJO.md`](docs/FLUJO_DE_TRABAJO.md) · [`docs/BACKLOG_SPRINT1.md`](docs/BACKLOG_SPRINT1.md) · [`docs/RETROSPECTIVA_SPRINT1.md`](docs/RETROSPECTIVA_SPRINT1.md)

## Puesta en marcha

```bash
npm install
cp .env.example .env          # edita DATABASE_URL con tu usuario, contraseña y puerto
psql -d barbercontrol -f barbercontrol.sql   # solo la primera vez (tablas y datos de ejemplo)
npx prisma generate
npm test                      # 29 pruebas unitarias (no requieren BD)
npm run test:bd               # 8 pruebas de integración en PostgreSQL (usa PGDATABASE/PGUSER...)
npm run dev                   # servidor en http://localhost:3000
```

## Integración continua

`.github/workflows/ci.yml` se ejecuta en cada *push* a `main` y en cada *pull request*:

| Job | Qué valida |
|---|---|
| `calidad` | `prisma validate` · `prisma generate` · `tsc --noEmit` (TypeScript strict) · `npm test` |
| `base-de-datos` | Levanta `postgres:16`, ejecuta `barbercontrol.sql` y `db/pruebas_bd.sql` |

## Endpoints

| Método | Ruta | Descripción | Éxito | Errores |
|---|---|---|:-:|---|
| POST | `/api/clientes` | Registro de cliente (HU-01) | 201 | 400, 409 correo repetido |
| GET | `/api/servicios` | Servicios activos (HU-02) | 200 | — |
| POST | `/api/citas` | Alta de cita (HU-03) | 201 | 400, 404, 409 traslape, 422 |
| GET | `/api/citas/:folio` | Consulta de una cita (HU-04) | 200 | 404 |
| GET | `/api/citas` | **Consulta con filtros y paginación** (HU-10) | 200 | 400 |
| GET | `/api/agenda/:fecha` | **Agenda del día** desde `v_agenda_diaria` (HU-07, RF-04) | 200 | 400 |
| PATCH | `/api/citas/:folio` | **Reprogramar** fecha, barbero, servicio u observaciones (HU-09) | 200 | 400, 403, 404, 409, 422 |
| PATCH | `/api/citas/:folio/estado` | **Cambiar estado**: cancelar, atender, finalizar (HU-06, HU-08) | 200 | 400, 403, 404, 409, 422 |
| GET | `/api/status` | Estado de la conexión a la BD | 200 | 503 |

### Consulta

Parámetros opcionales de `GET /api/citas`: `fecha` (un día) **o** `desde`/`hasta` (rango, ambos incluidos), `idBarbero`, `idCliente`, `idEstado` (1–4), `pagina` (desde 1), `porPagina` (máx. 100, predeterminado 20).

```bash
curl "localhost:3000/api/citas?fecha=2026-10-15&idBarbero=2"
curl "localhost:3000/api/citas?idCliente=5&desde=2026-10-01&hasta=2026-12-31&pagina=1&porPagina=10"
curl "localhost:3000/api/agenda/2026-10-15"            # sin canceladas
curl "localhost:3000/api/agenda/2026-10-15?incluirCanceladas=true"
```

Respuesta del listado:

```json
{ "pagina": 1, "porPagina": 20, "total": 3, "totalPaginas": 1,
  "citas": [ { "folio": "BC-2026-000002", "fechaHoraInicio": "...", "estado": { "idEstado": 1, "nombre": "Pendiente" }, "...": "..." } ] }
```

### Actualización

```bash
# Reprogramar: solo se envía lo que cambia. Mismas reglas que el alta (horario, bloqueos, traslape).
curl -X PATCH localhost:3000/api/citas/BC-2026-000002 -H "Content-Type: application/json" \
  -d '{ "idUsuario": 5, "fechaHoraInicio": "2026-12-04 12:00" }'

# Cambiar de servicio: se copian la duración y el precio vigentes del catálogo.
curl -X PATCH localhost:3000/api/citas/BC-2026-000002 -H "Content-Type: application/json" \
  -d '{ "idUsuario": 5, "idServicio": 2 }'

# Cancelar (cliente dueño o administrador) -> libera el horario (RF-05)
curl -X PATCH localhost:3000/api/citas/BC-2026-000002/estado -H "Content-Type: application/json" \
  -d '{ "idUsuario": 5, "idEstado": 4 }'

# Atender y finalizar (barbero asignado o administrador)
curl -X PATCH localhost:3000/api/citas/BC-2026-000003/estado -H "Content-Type: application/json" \
  -d '{ "idUsuario": 3, "idEstado": 2 }'
```

Ciclo de vida: `Pendiente → En Atención → Finalizada` o `Pendiente → Cancelada`.

| Código | HTTP | Significado |
|---|:-:|---|
| `SIN_PERMISO` | 403 | El usuario no puede hacer ese cambio (p. ej. un cliente cancelando la cita de otro) |
| `TRANSICION_NO_PERMITIDA` | 422 | El estado nuevo no sigue el ciclo de vida |
| `CITA_NO_MODIFICABLE` | 422 | Solo se reprograman citas Pendientes |
| `HORARIO_OCUPADO` | 409 | El nuevo horario se traslapa con otra cita (RF-03, lo detecta la BD) |
| `CITA_MODIFICADA` | 409 | Otra persona cambió la cita al mismo tiempo; volver a consultarla |
| `FECHA_PASADA`, `HORA_NO_VALIDA`, `FUERA_DE_HORARIO`, `AGENDA_BLOQUEADA`, `BARBERO_NO_OFRECE_SERVICIO` | 422 | Igual que en el alta |

> Mientras no exista inicio de sesión (HU-05, Sprint 3), quien realiza la acción viaja como `idUsuario` en el cuerpo.

## Arquitectura (MVC por capas)

```
src/
├── routes/index.ts                   Qué URL llama a qué controlador
├── controllers/                      HTTP <-> servicios (sin reglas de negocio)
├── services/
│   ├── cita.service.ts               Alta de cita (Sprint 1)
│   ├── cita-actualizacion.service.ts Reprogramar y cambiar estado (Sprint 2)
│   ├── cita-consulta.service.ts      Listado con filtros y agenda diaria (Sprint 2)
│   ├── reglas-cita.ts                Reglas de agenda compartidas por alta y reprogramación
│   ├── permisos-cita.ts              Quién puede cambiar qué y ciclo de estados (puras)
│   └── disponibilidad.ts             Reglas de horario (puras)
├── validators/                       Solo FORMATO de los datos (cuerpo y parámetros de URL)
├── repositories/                     Único lugar con consultas a la BD (Prisma)
├── constants/catalogos.ts            Ids fijos de rol y estado
├── errors/  middlewares/  utils/  types/
└── tests/                            Pruebas unitarias (node:test)
db/pruebas_bd.sql                     Pruebas de integración en PostgreSQL
.github/workflows/ci.yml              Pipeline de integración continua
```
