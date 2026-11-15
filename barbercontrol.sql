-- =====================================================================
-- BarberControl v1.0 | Actividad 7.1 | Script de creación (PostgreSQL 14+)
-- Equipo: Martínez Mota Diana Angélica (22540267) / Eduardo Guevara Ruiz (23540259)

-- =====================================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;   -- necesario para la restricción anti-solapamiento

-- ---------- 1. CATÁLOGOS FIJOS ----------
CREATE TABLE rol (
    id_rol SMALLINT PRIMARY KEY,
    nombre VARCHAR(20) NOT NULL UNIQUE,
    descripcion VARCHAR(100)
);

CREATE TABLE estado_cita (
    id_estado SMALLINT PRIMARY KEY,
    nombre VARCHAR(20) NOT NULL UNIQUE,
    descripcion VARCHAR(100)
);

CREATE TABLE metodo_pago (
    id_metodo SMALLINT PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE
);

-- ---------- 2. USUARIOS Y BARBEROS ----------
CREATE TABLE usuario (
    id_usuario INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_rol SMALLINT NOT NULL REFERENCES rol(id_rol),
    nombre VARCHAR(60) NOT NULL,
    apellidos VARCHAR(80) NOT NULL,
    correo VARCHAR(120) NOT NULL UNIQUE,
    telefono VARCHAR(15),
    password_hash VARCHAR(255) NOT NULL,
    acepto_aviso_privacidad BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE barbero (
    id_barbero INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario INTEGER NOT NULL UNIQUE REFERENCES usuario(id_usuario),
    especialidad VARCHAR(80),
    fecha_ingreso DATE NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------- 3. CATÁLOGO DE SERVICIOS ----------
CREATE TABLE servicio (
    id_servicio INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    duracion_min SMALLINT NOT NULL CHECK (duracion_min > 0 AND duracion_min % 15 = 0),
    precio NUMERIC(8,2) NOT NULL CHECK (precio >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE barbero_servicio (
    id_barbero INTEGER NOT NULL REFERENCES barbero(id_barbero),
    id_servicio INTEGER NOT NULL REFERENCES servicio(id_servicio),
    PRIMARY KEY (id_barbero, id_servicio)
);

-- ---------- 4. DISPONIBILIDAD DEL BARBERO ----------
CREATE TABLE horario_barbero (
    id_horario INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_barbero INTEGER NOT NULL REFERENCES barbero(id_barbero),
    dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    CHECK (hora_fin > hora_inicio),
    UNIQUE (id_barbero, dia_semana, hora_inicio)
);

CREATE TABLE bloqueo_agenda (
    id_bloqueo INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_barbero INTEGER NOT NULL REFERENCES barbero(id_barbero),
    fecha_hora_inicio TIMESTAMP NOT NULL,
    fecha_hora_fin TIMESTAMP NOT NULL,
    motivo VARCHAR(100) NOT NULL,
    CHECK (fecha_hora_fin > fecha_hora_inicio)
);

-- ---------- 5. CITAS (ENTIDAD CENTRAL) ----------
CREATE SEQUENCE seq_folio_cita START 1;

CREATE TABLE cita (
    id_cita INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    folio VARCHAR(20)  NOT NULL UNIQUE
    DEFAULT ('BC-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('seq_folio_cita')::text, 6, '0')),
    id_cliente INTEGER NOT NULL REFERENCES usuario(id_usuario),
    id_barbero INTEGER NOT NULL REFERENCES barbero(id_barbero),
    id_servicio INTEGER NOT NULL REFERENCES servicio(id_servicio),
    id_estado SMALLINT NOT NULL DEFAULT 1 REFERENCES estado_cita(id_estado),
    fecha_hora_inicio TIMESTAMP NOT NULL,
    -- El Motor de Citas copia duración y precio del catálogo vigente al reservar:
    duracion_min_aplicada SMALLINT NOT NULL CHECK (duracion_min_aplicada > 0),
    -- RF-03: Hora_Inicio + Duración, calculado por el propio SGBD (no editable)
    fecha_hora_fin TIMESTAMP GENERATED ALWAYS AS
    (fecha_hora_inicio + duracion_min_aplicada * INTERVAL '1 minute') STORED,
    precio_aplicado NUMERIC(8,2) NOT NULL CHECK (precio_aplicado >= 0),
    observaciones VARCHAR(255),
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- RF-03 (CRÍTICO): un barbero no puede tener dos citas activas que se traslapen.
    -- Las citas Canceladas (id_estado = 4) liberan el horario (RF-05).
    CONSTRAINT ex_cita_sin_solapamiento
        EXCLUDE USING gist (id_barbero WITH =,
                            tsrange(fecha_hora_inicio, fecha_hora_fin, '[)') WITH &&)
        WHERE (id_estado <> 4)
);

-- ---------- 6. COBROS Y BITÁCORA ----------
CREATE TABLE pago (
    id_pago INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cita INTEGER NOT NULL UNIQUE REFERENCES cita(id_cita),
    id_metodo SMALLINT NOT NULL REFERENCES metodo_pago(id_metodo),
    id_usuario_cobra INTEGER NOT NULL REFERENCES usuario(id_usuario),
    monto NUMERIC(8,2) NOT NULL CHECK (monto > 0),
    fecha_pago TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE historial_estado_cita (
    id_historial INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cita INTEGER NOT NULL REFERENCES cita(id_cita),
    id_estado_anterior SMALLINT REFERENCES estado_cita(id_estado),
    id_estado_nuevo SMALLINT NOT NULL REFERENCES estado_cita(id_estado),
    id_usuario INTEGER REFERENCES usuario(id_usuario),
    fecha_cambio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bitácora automática. La aplicación puede indicar quién actúa con:
--   SET LOCAL barbercontrol.id_usuario = '<id>';
CREATE OR REPLACE FUNCTION fn_historial_estado() RETURNS trigger AS $$
DECLARE v_usr INTEGER := NULLIF(current_setting('barbercontrol.id_usuario', true), '')::INTEGER;
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO historial_estado_cita (id_cita, id_estado_anterior, id_estado_nuevo, id_usuario)
        VALUES (NEW.id_cita, NULL, NEW.id_estado, v_usr);
    ELSIF NEW.id_estado IS DISTINCT FROM OLD.id_estado THEN
        INSERT INTO historial_estado_cita (id_cita, id_estado_anterior, id_estado_nuevo, id_usuario)
        VALUES (NEW.id_cita, OLD.id_estado, NEW.id_estado, v_usr);
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cita_historial
AFTER INSERT OR UPDATE OF id_estado ON cita
FOR EACH ROW EXECUTE FUNCTION fn_historial_estado();

-- ---------- 7. ÍNDICES (RNF-01: consulta de disponibilidad <= 1.5 s) ----------
CREATE INDEX idx_cita_barbero_inicio ON cita (id_barbero, fecha_hora_inicio);
CREATE INDEX idx_cita_cliente        ON cita (id_cliente);
CREATE INDEX idx_cita_estado         ON cita (id_estado);
CREATE INDEX idx_bloqueo_barbero     ON bloqueo_agenda (id_barbero, fecha_hora_inicio);
CREATE INDEX idx_historial_cita      ON historial_estado_cita (id_cita);

-- ---------- 8. VISTA PARA EL PANEL DE AGENDA DIARIA (RF-04) ----------
CREATE VIEW v_agenda_diaria AS
SELECT c.id_cita, c.folio, c.fecha_hora_inicio::date AS fecha,
       c.fecha_hora_inicio, c.fecha_hora_fin,
       ub.nombre || ' ' || ub.apellidos AS barbero,
       uc.nombre || ' ' || uc.apellidos AS cliente,
       s.nombre AS servicio, e.nombre AS estado
FROM cita c
JOIN barbero b  ON b.id_barbero  = c.id_barbero
JOIN usuario ub ON ub.id_usuario = b.id_usuario
JOIN usuario uc ON uc.id_usuario = c.id_cliente
JOIN servicio s ON s.id_servicio = c.id_servicio
JOIN estado_cita e ON e.id_estado = c.id_estado;

-- =====================================================================
-- DATOS INICIALES Y DE EJEMPLO
-- =====================================================================
INSERT INTO rol VALUES 
(1,'Administrador','Gestiona catálogo, barberos, agenda y reportes'),
(2,'Barbero','Consulta su agenda y cambia el estado de sus citas'),
(3,'Cliente','Consulta servicios y agenda, modifica o cancela sus citas');
INSERT INTO estado_cita VALUES 
(1,'Pendiente','Cita agendada, aún no atendida'),
(2,'En Atención','El barbero está prestando el servicio'),
(3,'Finalizada','Servicio concluido'),
(4,'Cancelada','Cita cancelada; libera el horario');
INSERT INTO metodo_pago VALUES (1,'Efectivo'),(2,'Transferencia');

-- Contraseñas de ejemplo: hashes ficticios (en producción los genera la aplicación con bcrypt)
INSERT INTO usuario (id_rol,nombre,apellidos,correo,telefono,password_hash,acepto_aviso_privacidad) VALUES
 (1,'Roberto','Hernández','roberto@barbercontrol.mx','6395550101','$2b$12$HASH_EJEMPLO_ADMIN',TRUE),
 (2,'Luis','Ramos','luis@barbercontrol.mx','6395550102','$2b$12$HASH_EJEMPLO_BARBERO',TRUE),
 (2,'Miguel','Torres','miguel@barbercontrol.mx','6395550103','$2b$12$HASH_EJEMPLO_BARBERO',TRUE),
 (2,'Andrés','Salazar','andres@barbercontrol.mx','6395550104','$2b$12$HASH_EJEMPLO_BARBERO',TRUE),
 (3,'Juan','Pérez','juan.perez@correo.com','6395550201','$2b$12$HASH_EJEMPLO_CLIENTE',TRUE),
 (3,'Carlos','Méndez','carlos.mendez@correo.com','6395550202','$2b$12$HASH_EJEMPLO_CLIENTE',TRUE),
 (3,'Jorge','Luna','jorge.luna@correo.com',NULL,'$2b$12$HASH_EJEMPLO_CLIENTE',TRUE);

INSERT INTO barbero (id_usuario,especialidad,fecha_ingreso) VALUES
 (1,'Corte clásico y barba','2018-03-01'),(2,'Degradados','2020-06-15'),
 (3,'Color y tintes','2021-09-01'),(4,'Perfilado de barba','2023-01-10');

INSERT INTO servicio (nombre,descripcion,duracion_min,precio) VALUES
 ('Corte clásico','Corte de cabello con tijera y máquina',30,150.00),
 ('Corte + Barba','Corte de cabello y arreglo de barba',60,250.00),
 ('Perfilado de barba','Perfilado y definición de barba',60,150.00),
 ('Tinte de cabello','Aplicación de tinte y peinado',60,300.00),
 ('Afeitado clásico','Afeitado con toalla caliente',30,100.00);

INSERT INTO barbero_servicio (id_barbero,id_servicio)
SELECT b.id_barbero, s.id_servicio FROM barbero b CROSS JOIN servicio s;

-- Horario: lunes a sábado, 10:00-14:00 y 15:00-19:00 (hora de comida de 14:00 a 15:00)
INSERT INTO horario_barbero (id_barbero,dia_semana,hora_inicio,hora_fin)
SELECT b.id_barbero, d, t.i, t.f
FROM barbero b CROSS JOIN generate_series(1,6) AS d
CROSS JOIN (VALUES ('10:00'::time,'14:00'::time), ('15:00'::time,'19:00'::time)) AS t(i,f);

INSERT INTO bloqueo_agenda (id_barbero,fecha_hora_inicio,fecha_hora_fin,motivo) VALUES
 (3,'2026-10-16 10:00','2026-10-16 19:00','Falta justificada');

-- Citas de ejemplo (el folio se genera con la secuencia)
INSERT INTO cita (id_cliente,id_barbero,id_servicio,fecha_hora_inicio,duracion_min_aplicada,precio_aplicado)
VALUES (6,2,1,'2026-10-15 15:00',30,150.00);                         -- cita 1 (se cancelará)
UPDATE cita SET id_estado = 4 WHERE id_cita = 1;                      -- RF-05: libera el horario
INSERT INTO cita (id_cliente,id_barbero,id_servicio,fecha_hora_inicio,duracion_min_aplicada,precio_aplicado) VALUES
 (5,2,1,'2026-10-15 15:00',30,150.00),    -- cita 2: mismo horario, ahora libre
 (6,3,4,'2026-10-15 11:00',60,300.00),    -- cita 3
 (7,2,2,'2026-10-15 16:00',60,250.00),    -- cita 4
 (5,4,3,'2026-10-14 10:00',60,150.00);    -- cita 5 (ya atendida)
UPDATE cita SET id_estado = 2 WHERE id_cita = 5;
UPDATE cita SET id_estado = 3 WHERE id_cita = 5;
INSERT INTO pago (id_cita,id_metodo,id_usuario_cobra,monto) VALUES (5,1,1,150.00);

-- ---------- PRUEBA DE RF-03 (debe fallar con "ex_cita_sin_solapamiento") ----------
-- INSERT INTO cita (id_cliente,id_barbero,id_servicio,fecha_hora_inicio,duracion_min_aplicada,precio_aplicado)
-- VALUES (7,2,1,'2026-10-15 15:15',30,150.00);
