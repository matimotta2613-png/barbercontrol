# BarberControl v1.1 — Sprint 1 (Actividad 11.1)

Node.js + TypeScript + Express + Prisma ORM + PostgreSQL 16 (base de la Actividad 7.1).
Proceso construido: **registro de cliente** y **alta de cita** (entidad central).

Documentos del sprint: [`docs/BACKLOG_SPRINT1.md`](docs/BACKLOG_SPRINT1.md) · [`docs/RETROSPECTIVA_SPRINT1.md`](docs/RETROSPECTIVA_SPRINT1.md)

## Puesta en marcha

```bash
npm install
cp .env.example .env          # edita DATABASE_URL con tu usuario, contraseña y puerto
psql -d barbercontrol -f barbercontrol.sql   # solo la primera vez (crea tablas y datos de ejemplo)
npx prisma generate
npm test                      # pruebas de validaciones y reglas de horario (no requieren BD)
npm run prueba:conexion       # prueba de punta a punta contra la BD
npm run dev                   # servidor en http://localhost:3000
```

## Arquitectura (MVC por capas)

```
src/
├── routes/index.ts               Qué URL llama a qué controlador
├── controllers/                  Traducen HTTP <-> servicios (sin reglas de negocio)
├── services/
│   ├── cita.service.ts           registrarCita(): el proceso de alta, paso a paso
│   ├── cliente.service.ts        registrarCliente()
│   └── disponibilidad.ts         Reglas de horario (funciones puras, con pruebas)
├── validators/                   Solo FORMATO de los datos (LectorDeCampos acumula errores)
├── repositories/                 Único lugar con consultas a la BD (Prisma)
├── errors/errores.ts             Errores con código HTTP (400, 404, 409, 422)
├── middlewares/manejar-errores.ts  Un solo lugar que convierte errores en respuestas JSON
├── utils/fechas.ts               Convención de hora local de la barbería
└── tests/                        Pruebas automáticas (node:test)
```

## Endpoints

| Método | Ruta | Descripción | Éxito | Errores |
|---|---|---|:-:|---|
| POST | `/api/clientes` | Registro de cliente | 201 | 400 datos, 409 correo repetido |
| GET | `/api/servicios` | Servicios activos | 200 | — |
| POST | `/api/citas` | **Alta de cita** | 201 | 400, 404, 409 traslape (RF-03), 422 regla de negocio |
| GET | `/api/citas/:folio` | Consulta de cita | 200 | 404 |
| GET | `/api/status` | Estado de la conexión a la BD | 200 | 503 |

### Ejemplos

```bash
curl -X POST localhost:3000/api/clientes -H "Content-Type: application/json" -d '{
  "nombre":"Ana","apellidos":"López Ruiz","correo":"ana@correo.com",
  "telefono":"6395550123","password":"Segura1234","aceptoAvisoPrivacidad":true }'

curl -X POST localhost:3000/api/citas -H "Content-Type: application/json" -d '{
  "idCliente":5,"idBarbero":1,"idServicio":2,
  "fechaHoraInicio":"2026-12-04 11:00","observaciones":"Corte y barba" }'
```

Códigos de error de negocio en `POST /api/citas`: `HORARIO_OCUPADO` (409), `FECHA_PASADA`, `HORA_NO_VALIDA`, `FUERA_DE_HORARIO`, `AGENDA_BLOQUEADA`, `BARBERO_NO_OFRECE_SERVICIO` (422).

> Mientras no exista inicio de sesión (HU-05), `idCliente` viaja en el cuerpo de la petición.
