/**
 * BarberControl v1.2 | Ids fijos de los catálogos del script 7.1
 * src/constants/catalogos.ts
 *
 * Viven aparte de los repositorios para que las reglas puras (y sus pruebas)
 * puedan usarlos sin cargar el cliente de base de datos.
 */
export const ROL = { ADMINISTRADOR: 1, BARBERO: 2, CLIENTE: 3 } as const;

export const ESTADO = { PENDIENTE: 1, EN_ATENCION: 2, FINALIZADA: 3, CANCELADA: 4 } as const;

export const NOMBRE_ESTADO: Record<number, string> = {
  [ESTADO.PENDIENTE]: 'Pendiente',
  [ESTADO.EN_ATENCION]: 'En Atención',
  [ESTADO.FINALIZADA]: 'Finalizada',
  [ESTADO.CANCELADA]: 'Cancelada',
};
