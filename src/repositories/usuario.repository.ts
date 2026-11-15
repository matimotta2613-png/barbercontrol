/**
 * BarberControl v1.0 | Repositorio de Usuarios (capa Modelo del MVC)
 * src/repositories/usuario.repository.ts
 *
 * Encapsula el acceso a la tabla "usuario" mediante el modelo Prisma Usuario.
 */
import { prisma } from '../config/database';

/** Ids fijos del catálogo "rol" (script 7.1). */
export const ROL = { ADMINISTRADOR: 1, BARBERO: 2, CLIENTE: 3 } as const;

export interface NuevoCliente {
  nombre: string;
  apellidos: string;
  correo: string;
  telefono?: string;
  passwordHash: string; // el módulo de autenticación lo genera con bcrypt
}

/** INSERT INTO usuario (...) con rol Cliente. Devuelve el registro con su rol. */
export function crearCliente(datos: NuevoCliente) {
  return prisma.usuario.create({
    data: {
      ...datos,
      correo: datos.correo.toLowerCase(),
      aceptoAvisoPrivacidad: true, // requisito de registro (aviso de privacidad)
      rol: { connect: { idRol: ROL.CLIENTE } },
    },
    include: { rol: true },
  });
}

/** SELECT ... FROM usuario WHERE correo = $1 */
export function buscarPorCorreo(correo: string) {
  return prisma.usuario.findUnique({
    where: { correo: correo.toLowerCase() },
    include: { rol: true },
  });
}

/** SELECT ... FROM usuario WHERE id_usuario = $1 AND id_rol = 3 AND activo */
export function buscarClienteActivo(idUsuario: number) {
  return prisma.usuario.findFirst({ where: { idUsuario, idRol: ROL.CLIENTE, activo: true } });
}
