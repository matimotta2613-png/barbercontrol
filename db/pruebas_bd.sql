-- =====================================================================
-- BarberControl v1.2 | Sprint 2 | Pruebas de integración en PostgreSQL
-- Ejecutar DESPUÉS de barbercontrol.sql:
--   psql -d barbercontrol -v ON_ERROR_STOP=1 -f db/pruebas_bd.sql
--
-- Comprueban que la base de datos respalda los procesos de ACTUALIZACIÓN y
-- CONSULTA del Sprint 2 con las mismas sentencias que genera la aplicación.
-- Todo corre dentro de una transacción que al final se deshace (ROLLBACK):
-- la base queda igual que antes. Si un ASSERT falla, psql termina con error
-- y el pipeline de CI se marca en rojo.
-- Datos de partida (script 7.1), barbero 2 el 2026-10-15:
--   cita 2: 15:00-15:30 (Pendiente) · cita 4: 16:00-17:00 (Pendiente)
-- =====================================================================
\set QUIET on
BEGIN;

-- 1. Reprogramar a un horario libre: la BD recalcula la hora de fin.
DO $$
DECLARE v_fin TIMESTAMP;
BEGIN
    UPDATE cita SET fecha_hora_inicio = '2026-10-15 15:30'
    WHERE id_cita = 2 AND id_estado = 1
    RETURNING fecha_hora_fin INTO v_fin;
    ASSERT v_fin = '2026-10-15 16:00', 'fecha_hora_fin no se recalculó: ' || v_fin;
    RAISE NOTICE 'OK 1 - reprogramar a horario libre recalcula fecha_hora_fin (%)', v_fin;
END $$;

-- 2. Reprogramar encima de otra cita activa: la BD lo rechaza (RF-03).
DO $$
BEGIN
    UPDATE cita SET fecha_hora_inicio = '2026-10-15 16:30' WHERE id_cita = 2 AND id_estado = 1;
    RAISE EXCEPTION 'FALLO 2 - se permitió reprogramar encima de la cita 4';
EXCEPTION WHEN exclusion_violation THEN
    ASSERT SQLERRM LIKE '%ex_cita_sin_solapamiento%', 'Restricción inesperada: ' || SQLERRM;
    RAISE NOTICE 'OK 2 - reprogramar a un horario ocupado falla con ex_cita_sin_solapamiento';
END $$;

-- 3. Moverse a un horario que se cruza solo con su propio horario anterior sí se permite.
DO $$
BEGIN
    UPDATE cita SET fecha_hora_inicio = '2026-10-15 15:15' WHERE id_cita = 2 AND id_estado = 1;
    ASSERT FOUND, 'No se actualizó la cita 2';
    RAISE NOTICE 'OK 3 - una cita puede recorrerse sobre su propio horario anterior';
END $$;

-- 4. Cambiar el servicio: duración y precio nuevos, mismo control de traslape.
DO $$
DECLARE v_fin TIMESTAMP;
BEGIN
    -- 15:15 + 60 min = 16:15 -> choca con la cita 4 (16:00)
    BEGIN
        UPDATE cita SET id_servicio = 2, duracion_min_aplicada = 60, precio_aplicado = 250
        WHERE id_cita = 2 AND id_estado = 1;
        RAISE EXCEPTION 'FALLO 4 - un servicio más largo invadió la cita siguiente';
    EXCEPTION WHEN exclusion_violation THEN
        RAISE NOTICE 'OK 4a - alargar el servicio hasta invadir otra cita se rechaza';
    END;
    UPDATE cita SET fecha_hora_inicio = '2026-10-15 17:00', id_servicio = 2,
                    duracion_min_aplicada = 60, precio_aplicado = 250
    WHERE id_cita = 2 AND id_estado = 1
    RETURNING fecha_hora_fin INTO v_fin;
    ASSERT v_fin = '2026-10-15 18:00';
    RAISE NOTICE 'OK 4b - cambio de servicio y horario aceptado (fin %)', v_fin;
END $$;

-- 5. UPDATE condicionado al estado: una cita Finalizada no se modifica (0 filas -> 409 en la API).
DO $$
DECLARE v_filas INTEGER;
BEGIN
    UPDATE cita SET fecha_hora_inicio = '2026-10-20 10:00' WHERE id_cita = 5 AND id_estado = 1;
    GET DIAGNOSTICS v_filas = ROW_COUNT;
    ASSERT v_filas = 0, 'Se modificó una cita Finalizada';
    RAISE NOTICE 'OK 5 - el UPDATE condicionado no toca citas que ya no están Pendientes';
END $$;

-- 6. Cambio de estado: el trigger registra la bitácora con quién lo hizo.
DO $$
DECLARE v_hist historial_estado_cita%ROWTYPE;
BEGIN
    PERFORM set_config('barbercontrol.id_usuario', '3', true);   -- Miguel, barbero de la cita 3
    UPDATE cita SET id_estado = 2 WHERE id_cita = 3 AND id_estado = 1;
    SELECT * INTO v_hist FROM historial_estado_cita WHERE id_cita = 3 ORDER BY id_historial DESC LIMIT 1;
    ASSERT v_hist.id_estado_anterior = 1 AND v_hist.id_estado_nuevo = 2, 'Bitácora sin la transición 1 -> 2';
    ASSERT v_hist.id_usuario = 3, 'Bitácora sin el usuario que hizo el cambio';
    RAISE NOTICE 'OK 6 - la bitácora guarda Pendiente -> En Atención hecho por el usuario 3';
END $$;

-- 7. Cancelar libera el horario (RF-05): se puede agendar otra cita en el mismo lugar.
DO $$
BEGIN
    PERFORM set_config('barbercontrol.id_usuario', '7', true);   -- Jorge, cliente de la cita 4
    UPDATE cita SET id_estado = 4 WHERE id_cita = 4 AND id_estado = 1;
    INSERT INTO cita (id_cliente, id_barbero, id_servicio, fecha_hora_inicio, duracion_min_aplicada, precio_aplicado)
    VALUES (6, 2, 1, '2026-10-15 16:00', 30, 150.00);
    RAISE NOTICE 'OK 7 - tras cancelar la cita 4 se agenda otra a las 16:00';
END $$;

-- 8. Consulta: agenda diaria (vista RF-04) y listado con filtros y paginación.
DO $$
DECLARE v_agenda INTEGER; v_total INTEGER; v_pagina INTEGER;
BEGIN
    SELECT count(*) INTO v_agenda FROM v_agenda_diaria
    WHERE fecha = '2026-10-15' AND estado <> 'Cancelada';
    ASSERT v_agenda = 3, 'La agenda del 15/10 debería tener 3 citas activas, tiene ' || v_agenda;

    -- Mismo filtro que GET /api/citas?fecha=2026-10-15&idBarbero=2&porPagina=1
    SELECT count(*) INTO v_total FROM cita
    WHERE id_barbero = 2 AND fecha_hora_inicio >= '2026-10-15' AND fecha_hora_inicio < '2026-10-16';
    SELECT count(*) INTO v_pagina FROM (
        SELECT id_cita FROM cita
        WHERE id_barbero = 2 AND fecha_hora_inicio >= '2026-10-15' AND fecha_hora_inicio < '2026-10-16'
        ORDER BY fecha_hora_inicio, id_cita LIMIT 1 OFFSET 0) AS pagina;
    ASSERT v_total = 4 AND v_pagina = 1, format('Listado: total %s, página %s', v_total, v_pagina);
    RAISE NOTICE 'OK 8 - agenda diaria con % citas activas; listado del barbero 2: % en total, % por página', v_agenda, v_total, v_pagina;
END $$;

ROLLBACK;
\echo 'Pruebas de base de datos: 8 de 8 correctas (cambios deshechos con ROLLBACK)'
