/**
 * BarberControl v1.0 | Repositorio de catálogo (servicios y barberos)
 * src/repositories/catalogo.repository.ts
 */
import { prisma } from '../config/database';

export function listarServiciosActivos() {
  return prisma.servicio.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } });
}

export function buscarServicioActivo(idServicio: number) {
  return prisma.servicio.findFirst({ where: { idServicio, activo: true } });
}

export function buscarBarberoActivo(idBarbero: number) {
  return prisma.barbero.findFirst({ where: { idBarbero, activo: true } });
}

export async function barberoOfreceServicio(idBarbero: number, idServicio: number): Promise<boolean> {
  const total = await prisma.barberoServicio.count({ where: { idBarbero, idServicio } });
  return total > 0;
}
