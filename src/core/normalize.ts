import type { UnifiedItem } from "../types";

export function normalizeNotification(r: any): UnifiedItem {
  return { source: "notificacion", id: String(r.identifier), date: r.finalDate ?? r.availabilityDate,
    emitter: r.emitterEntity ?? "", concept: r.concept ?? "", state: r.state ?? "",
    expirationDate: r.expirationDate ?? null, hasAnnexes: !!r.hasAnnexes, raw: r };
}

export function normalizeCommunication(r: any): UnifiedItem {
  return { source: "comunicacion", id: String(r.identifier), date: r.availabilityDate,
    emitter: r.emitterEntity ?? "", concept: r.concept ?? "", state: r.state ?? "",
    expirationDate: r.expirationDate ?? null, hasAnnexes: !!r.hasAnnexes, raw: r };
}

export function mergeDedupeSort(items: UnifiedItem[]): UnifiedItem[] {
  const seen = new Map<string, UnifiedItem>();
  for (const it of items) seen.set(`${it.source}:${it.id}`, it);
  return [...seen.values()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
