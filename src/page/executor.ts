import type { Executor, PageResult, Source, DateWindow } from "../types";
import { formatDDMMYYYY } from "../core/windows";

const BASE = "https://dehu.redsara.es";

export function buildQuery(source: Source, window: DateWindow, page: number, limit: number): string {
  const left = formatDDMMYYYY(window.start), right = formatDDMMYYYY(window.end);
  const p = new URLSearchParams();
  if (source === "notificacion") {
    p.set("finalDate[left_date]", left); p.set("finalDate[right_date]", right);
  } else {
    p.set("availabilityDate[left_date]", left); p.set("availabilityDate[right_date]", right);
  }
  p.set("page", String(page)); p.set("limit", String(limit));
  const path = source === "notificacion" ? "/api/v1/realized_notifications" : "/api/v1/communications";
  return `${BASE}${path}?${p.toString()}`;
}

export function makeExecutor(getToken: () => string | null): Executor {
  return { async fetchPage({ source, window, page, limit }): Promise<PageResult> {
    const token = getToken();
    const res = await fetch(buildQuery(source, window, page, limit), {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw { status: res.status };
    const json = await res.json();
    return { total: json.total ?? json.count ?? 0, items: json.items ?? [] };
  } };
}
