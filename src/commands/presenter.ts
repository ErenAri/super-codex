export type OutputStyle = "plain" | "decorated";

export type IconKind =
  | "ok"
  | "warn"
  | "error"
  | "info"
  | "step"
  | "next"
  | "tip"
  | "section";

export interface StyleOptions {
  json?: boolean;
  plain?: boolean;
  isTTY?: boolean;
}

const DECORATED_ICONS: Record<IconKind, string> = {
  ok: "✅",
  warn: "⚠️",
  error: "❌",
  info: "ℹ️",
  step: "•",
  next: "➡️",
  tip: "💡",
  section: "🧭"
};

const PLAIN_ICONS: Record<IconKind, string> = {
  ok: "[ok]",
  warn: "[warn]",
  error: "[error]",
  info: "[info]",
  step: "-",
  next: "->",
  tip: "[tip]",
  section: "#"
};

export function resolveOutputStyle(options: StyleOptions): OutputStyle {
  if (options.json || options.plain) {
    return "plain";
  }

  const isTTY = typeof options.isTTY === "boolean" ? options.isTTY : Boolean(process.stdout.isTTY);
  return isTTY ? "decorated" : "plain";
}

export function icon(kind: IconKind, style: OutputStyle): string {
  return style === "decorated" ? DECORATED_ICONS[kind] : PLAIN_ICONS[kind];
}

export function line(kind: IconKind, text: string, style: OutputStyle): string {
  return `${icon(kind, style)} ${text}`;
}

export function kv(label: string, value: string, style: OutputStyle, kind: IconKind = "info"): string {
  return line(kind, `${label}: ${value}`, style);
}

export function bullet(text: string, style: OutputStyle, kind: IconKind = "step"): string {
  return line(kind, text, style);
}
