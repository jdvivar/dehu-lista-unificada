export type Source = "notificacion" | "comunicacion";

export interface UnifiedItem {
  source: Source;
  id: string;                 // API "identifier"
  date: string;               // ISO 8601; finalDate (notif) | availabilityDate (comun)
  emitter: string;            // API "emitterEntity"
  concept: string;
  state: string;
  expirationDate: string | null;
  hasAnnexes: boolean;
  raw: unknown;               // original API item, for deep-linking / debugging
}

export interface DateWindow { start: Date; end: Date; }

export interface PageResult { total: number; items: unknown[]; }

export interface Executor {
  // Throws { status:number } on HTTP errors so the engine can react (401/429/5xx).
  fetchPage(args: { source: Source; window: DateWindow; page: number; limit: number }): Promise<PageResult>;
}

export interface ScanProgress {
  windowIndex: number; windowCount: number;
  from: string; to: string;      // current window, ISO
  itemCount: number;
}
