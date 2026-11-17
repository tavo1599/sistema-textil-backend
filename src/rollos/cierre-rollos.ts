/**
 * CIERRE DE ROLLOS — ¿cuándo deja de verse un rollo en el almacén?
 * ===========================================================================
 * El recorrido de la tela es:
 *
 *    [ROLLO 25 kg] → ✂️ corte → 👕 taller → 📦 almacén de terminados
 *
 * Cuando el cortador se lleva los 25 kg, el rollo queda en 0 kg pero NO está
 * terminado: esos kilos andan por el taller en forma de prendas cortadas. Si
 * el corte se anula, la tela vuelve al rollo. Por eso el rollo en 0 kg sigue
 * a la vista, al final de la lista, marcado "en transformación".
 *
 * Recién cuando la producción llega al almacén (la transformación pasa a
 * RECIBIDO) ya no hay nada más que hacer con ese rollo: su tela entera es
 * ahora prenda vendible. Ahí se CIERRA y desaparece del almacén y del reporte.
 *
 * POR QUÉ SE CIERRA Y NO SE BORRA
 * ---------------------------------------------------------------------------
 *   1. El código se repetiría. El correlativo sale del id más alto de la
 *      tabla: si se borra R-000123 (el último), el próximo rollo nace con ESE
 *      mismo código. Borrar es justo lo que provoca la repetición.
 *   2. Se perdería el costo de las prendas. TransformacionRollo guarda el
 *      costo por kilo congelado del corte, y de ahí sale cuánto costó cada
 *      prenda que está en almacén. Sin el rollo, el costo queda huérfano.
 *   3. Se perdería la auditoría. MovimientoRollo es lo que responde "este
 *      rollo entró con 25 kg, ¿dónde se fueron?".
 *   4. No se podría anular un corte: al anularlo la tela regresa al rollo, y
 *      el rollo tiene que existir para recibirla.
 *
 * Un rollo cerrado se puede seguir consultando: en el almacén con la casilla
 * "ver rollos cerrados" o buscando su código, y siempre en su historial.
 */

/** Estados de una transformación en los que la tela TODAVÍA no volvió. */
export const ESTADOS_TRANSFORMACION_PENDIENTE = ['EN_PROCESO', 'PARCIAL'];

/**
 * Revisa los rollos indicados y los cierra o los reabre según corresponda.
 * Se llama después de CUALQUIER cosa que cambie los kilos de un rollo o el
 * estado de un corte, así la regla vive en un solo sitio.
 *
 * @param tx       cliente de Prisma (normalmente el de una transacción)
 * @param rolloIds ids de los rollos a revisar
 * @returns        { cerrados, reabiertos } con los códigos, para poder avisar
 */
export async function recalcularCierreRollos(
  tx: any,
  rolloIds: (number | null | undefined)[],
): Promise<{ cerrados: string[]; reabiertos: string[] }> {
  const ids = [...new Set((rolloIds || []).map((x) => Number(x)).filter((x) => x > 0))];
  const cerrados: string[] = [];
  const reabiertos: string[] = [];
  if (ids.length === 0) return { cerrados, reabiertos };

  const rollos = await tx.rolloTela.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      codigo: true,
      estado: true,
      pesoActual: true,
      cerradoEn: true,
      consumos: { select: { transformacion: { select: { estado: true } } } },
    },
  });

  for (const r of rollos) {
    // Los anulados ya están escondidos por su estado: no los tocamos.
    if (r.estado === 'ANULADO') continue;

    const hayCortePendiente = r.consumos.some((c: any) =>
      ESTADOS_TRANSFORMACION_PENDIENTE.includes(c.transformacion?.estado),
    );
    const debeCerrar = Number(r.pesoActual) <= 0 && !hayCortePendiente;

    if (debeCerrar && !r.cerradoEn) {
      await tx.rolloTela.update({ where: { id: r.id }, data: { cerradoEn: new Date() } });
      cerrados.push(r.codigo);
    } else if (!debeCerrar && r.cerradoEn) {
      // Volvió a tener kilos (ajuste de balanza) o se anuló el corte que se
      // los llevó: el rollo vuelve al almacén.
      await tx.rolloTela.update({ where: { id: r.id }, data: { cerradoEn: null } });
      reabiertos.push(r.codigo);
    }
  }

  return { cerrados, reabiertos };
}
