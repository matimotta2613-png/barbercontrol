/**
 * BarberControl v1.0 | Validación del registro de cliente
 * src/validators/cliente.validator.ts
 */
import { LectorDeCampos } from './lector-de-campos';

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FORMATO_TELEFONO = /^\d{10}$/;
const LARGO_MINIMO_PASSWORD = 8;
const LARGO_MAXIMO_PASSWORD = 72; // límite real de bcrypt

export interface SolicitudNuevoCliente {
  nombre: string;
  apellidos: string;
  correo: string;
  telefono?: string;
  password: string;
}

export function validarNuevoCliente(cuerpo: unknown): SolicitudNuevoCliente {
  const campos = new LectorDeCampos(cuerpo);
  const datos = cuerpo as Record<string, unknown>;

  const nombre = campos.texto('nombre', { max: 60 });
  const apellidos = campos.texto('apellidos', { max: 80 });
  const correo = campos.texto('correo', { max: 120 });
  const telefono = campos.texto('telefono', { max: 15, opcional: true });
  const password = campos.texto('password', {
    min: LARGO_MINIMO_PASSWORD,
    max: LARGO_MAXIMO_PASSWORD,
    recortar: false,
  });

  campos.exigir(correo === undefined || FORMATO_CORREO.test(correo), 'correo no tiene un formato válido');
  campos.exigir(telefono === undefined || FORMATO_TELEFONO.test(telefono), 'telefono debe tener 10 dígitos');
  // Sin aceptar el aviso de privacidad no hay registro.
  campos.exigir(datos.aceptoAvisoPrivacidad === true, 'Debes aceptar el aviso de privacidad');
  campos.terminar();

  return { nombre: nombre!, apellidos: apellidos!, correo: correo!, telefono, password: password! };
}
