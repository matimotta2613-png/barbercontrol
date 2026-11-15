# Retrospectiva del Sprint 1 — BarberControl

**Equipo:** Martínez Mota Diana Angélica · Eduardo Guevara Ruiz · **Actividad 11.1**

## ¿Qué funcionó bien?
Partir de la base de datos de la Actividad 7.1 nos ahorró mucho trabajo: el folio, la hora de fin, la bitácora y la regla anti-traslape (RF-03) ya las resolvía PostgreSQL, así que en el código solo tuvimos que traducir ese error a un mensaje de negocio. Separar el proceso en capas (validador → servicio → repositorio → controlador) hizo que cada archivo hiciera una sola cosa y que `registrarCita()` se lea como una lista de pasos con nombres claros (`exigirDentroDelHorario`, `exigirSinBloqueo`). Concentrar los errores en una sola jerarquía y un solo middleware evitó repetir `try/catch` y `res.status(...)` en cada ruta. Además, al dejar las reglas de disponibilidad como funciones puras pudimos probarlas con 14 pruebas automáticas sin necesitar la base de datos.

## ¿Qué se subestimó en tiempo o dificultad?
Lo más difícil fue el manejo de **fechas y horas**: las columnas son `TIMESTAMP` sin zona horaria, Prisma las entrega como UTC y las columnas `TIME` llegan como fechas de 1970, por lo que hubo que definir una convención única (hora local guardada como UTC) y probar casos como la hora de comida y las citas que terminan justo al cierre del tramo. También subestimamos las **validaciones de la cita**: pasó de "revisar que lleguen los datos" a siete reglas distintas (cliente activo, barbero que ofrece el servicio, fecha futura, bloques de 15 minutos, horario, bloqueos y traslape). Por último, no tener inicio de sesión nos obligó a recibir `idCliente` en el cuerpo de la petición como solución temporal, lo que habría que haber previsto al priorizar HU-05.

## Acciones para el Sprint 2
Hacer HU-05 (login) antes de cancelar o reprogramar citas; incluir pruebas de integración contra PostgreSQL; y estimar con margen las historias que involucren fechas.
