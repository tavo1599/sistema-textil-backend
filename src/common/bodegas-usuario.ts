import { PrismaService } from '../prisma/prisma.service';

/**
 * ALMACENES (BODEGAS) QUE UN USUARIO PUEDE VER
 * ===========================================================================
 * Un usuario puede tener asignadas ciertas bodegas (tabla UsuarioBodega). La
 * regla, pensada para no romper a nadie:
 *
 *   · ADMIN                      -> ve TODAS
 *   · usuario SIN bodegas asignadas -> ve TODAS (como siempre fue)
 *   · usuario CON bodegas asignadas -> solo esas
 *
 * Devuelve `null` cuando no hay restricción (ve todas), o la lista de ids.
 */
export async function bodegasDelUsuario(
  prisma: PrismaService,
  user: { id?: number; rol?: string } | undefined,
): Promise<number[] | null> {
  if (!user || user.rol === 'ADMIN') return null;
  const filas = await prisma.usuarioBodega.findMany({
    where: { usuarioId: Number(user.id) },
    select: { bodegaId: true },
  });
  if (filas.length === 0) return null; // sin asignación = ve todas
  return filas.map((f) => f.bodegaId);
}

/**
 * Filtro final de bodega para una consulta. Parte de lo que el usuario tiene
 * permitido y, si además pide una bodega puntual (un selector en la pantalla),
 * la respeta solo si está dentro de lo permitido. `null` = todas.
 */
export function filtroBodega(
  permitidas: number[] | null,
  pedida?: number,
): number[] | null {
  if (pedida && !Number.isNaN(pedida)) {
    if (permitidas === null) return [pedida];
    return permitidas.includes(pedida) ? [pedida] : permitidas;
  }
  return permitidas;
}
