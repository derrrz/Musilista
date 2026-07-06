import { db } from '@/db';
import { eventRepertoires, events, repertoires } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

// Valida que os setlists pertencem ao grupo; null = payload inválido.
export async function validRepertoireIds(groupId: string, ids: unknown): Promise<string[] | null> {
  if (ids === undefined || ids === null) return [];
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string')) return null;
  if (ids.length === 0) return [];
  const rows = await db
    .select({ id: repertoires.id })
    .from(repertoires)
    .where(and(eq(repertoires.groupId, groupId), inArray(repertoires.id, ids)));
  if (rows.length !== ids.length) return null;
  return ids;
}

// Sincroniza o vínculo evento↔setlists: N:N (event_repertoires) + o campo
// legado events.repertoire_id (primeiro da lista), que alimenta a agenda
// pública antiga e o setlistId do contrato mobile.
export async function syncEventRepertoires(eventId: string, repertoireIds: string[]) {
  await db.delete(eventRepertoires).where(eq(eventRepertoires.eventId, eventId));
  if (repertoireIds.length > 0) {
    await db.insert(eventRepertoires).values(repertoireIds.map((repertoireId) => ({ eventId, repertoireId })));
  }
  await db.update(events).set({ repertoireId: repertoireIds[0] ?? null }).where(eq(events.id, eventId));
}
