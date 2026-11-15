/**
 * BarberControl v1.0 | Lector de campos del cuerpo de una petición
 * src/validators/lector-de-campos.ts
 *
 * Herramienta común de los validadores: lee cada campo, acumula TODOS los
 * errores encontrados (no solo el primero) y los lanza juntos al final.
 */
import { ErrorDeValidacion } from '../errors/errores';
import { leerHoraLocal } from '../utils/fechas';

interface OpcionesTexto {
  max: number;
  min?: number;
  opcional?: boolean;
  recortar?: boolean; // quita espacios de los extremos (false para contraseñas)
}

export class LectorDeCampos {
  private readonly errores: string[] = [];
  private readonly cuerpo: Record<string, unknown>;

  constructor(cuerpo: unknown) {
    if (typeof cuerpo !== 'object' || cuerpo === null || Array.isArray(cuerpo)) {
      throw new ErrorDeValidacion(['El cuerpo de la petición debe ser un objeto JSON']);
    }
    this.cuerpo = cuerpo as Record<string, unknown>;
  }

  texto(campo: string, { max, min = 1, opcional = false, recortar = true }: OpcionesTexto): string | undefined {
    const valor = this.cuerpo[campo];
    if (valor === undefined || valor === null || valor === '') {
      if (!opcional) this.errores.push(`${campo} es obligatorio`);
      return undefined;
    }
    if (typeof valor !== 'string') return this.rechazar(`${campo} debe ser texto`);

    const texto = recortar ? valor.trim() : valor;
    if (texto.length < min) return this.rechazar(`${campo} debe tener al menos ${min} caracteres`);
    if (texto.length > max) return this.rechazar(`${campo} no puede pasar de ${max} caracteres`);
    return texto;
  }

  enteroPositivo(campo: string, { opcional = false }: { opcional?: boolean } = {}): number | undefined {
    const valor = this.cuerpo[campo];
    if (valor === undefined || valor === null) {
      return opcional ? undefined : this.rechazar(`${campo} es obligatorio`);
    }
    if (!Number.isInteger(valor) || (valor as number) <= 0) {
      return this.rechazar(`${campo} debe ser un número entero positivo`);
    }
    return valor as number;
  }

  fechaHoraLocal(campo: string, { opcional = false }: { opcional?: boolean } = {}): Date | undefined {
    const texto = this.texto(campo, { max: 16, opcional });
    if (texto === undefined) return undefined;
    return leerHoraLocal(texto) ?? this.rechazar(`${campo} debe tener el formato AAAA-MM-DD HH:mm`);
  }

  /** ¿El cuerpo trae el campo? (para saber qué quiere cambiar el usuario en una actualización) */
  trae(campo: string): boolean {
    return this.cuerpo[campo] !== undefined;
  }

  /** Para reglas de formato propias de cada validador (correo, teléfono...). */
  exigir(condicion: boolean, mensaje: string): void {
    if (!condicion) this.errores.push(mensaje);
  }

  /** Lanza ErrorDeValidacion con todos los problemas acumulados, si los hay. */
  terminar(): void {
    if (this.errores.length > 0) throw new ErrorDeValidacion(this.errores);
  }

  private rechazar(mensaje: string): undefined {
    this.errores.push(mensaje);
    return undefined;
  }
}
