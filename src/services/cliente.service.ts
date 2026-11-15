/**
 * BarberControl v1.0 | Servicio de Clientes (registro)
 * src/services/cliente.service.ts
 */
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { ConflictoError } from '../errors/errores';
import { crearCliente } from '../repositories/usuario.repository';
import { validarNuevoCliente } from '../validators/cliente.validator';

const COSTO_BCRYPT = 12;

export async function registrarCliente(cuerpo: unknown) {
  const { password, ...datos } = validarNuevoCliente(cuerpo);
  const passwordHash = await bcrypt.hash(password, COSTO_BCRYPT);

  try {
    const cliente = await crearCliente({ ...datos, passwordHash });
    return presentarCliente(cliente);
  } catch (error) {
    // El UNIQUE de usuario.correo es la única fuente de verdad (también cubre dos registros simultáneos).
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictoError('Ya existe una cuenta con ese correo', 'CORREO_DUPLICADO');
    }
    throw error;
  }
}

/** Lo que la API devuelve: nunca incluye passwordHash. */
function presentarCliente(cliente: Awaited<ReturnType<typeof crearCliente>>) {
  return {
    idUsuario: cliente.idUsuario,
    nombre: cliente.nombre,
    apellidos: cliente.apellidos,
    correo: cliente.correo,
    telefono: cliente.telefono,
    rol: cliente.rol.nombre,
    fechaRegistro: cliente.fechaRegistro,
  };
}
