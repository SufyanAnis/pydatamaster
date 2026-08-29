import { Pill } from "../../components/ui";
import type { ContactMessage, Role, UserStatus } from "../../lib/types";

type PillColor = "blue" | "slate" | "emerald" | "amber" | "red" | "indigo";

export const MESSAGE_STATUS_COLOR: Record<ContactMessage["status"], PillColor> = {
  new: "blue",
  read: "slate",
  replied: "emerald",
  archived: "amber",
};

export function MessageStatusPill({ status }: { status: string }) {
  const color = MESSAGE_STATUS_COLOR[status as ContactMessage["status"]] ?? "slate";
  return <Pill color={color}>{status}</Pill>;
}

export function RolePill({ role }: { role: Role }) {
  return <Pill color={role === "admin" ? "indigo" : "slate"}>{role}</Pill>;
}

export function UserStatusPill({ status }: { status: UserStatus }) {
  return <Pill color={status === "active" ? "emerald" : "red"}>{status}</Pill>;
}

export function ProviderPill({ provider }: { provider: string }) {
  const map: Record<string, PillColor> = { anthropic: "indigo", gemini: "blue", offline: "slate" };
  return <Pill color={map[provider] ?? "amber"}>{provider || "unknown"}</Pill>;
}

export function SourcePill({ source }: { source: string }) {
  const s = (source || "").toLowerCase();
  const color: PillColor = s.includes("pricing") ? "amber" : s.includes("notify") ? "blue" : s.includes("contact") ? "indigo" : "slate";
  return <Pill color={color}>{source || "unknown"}</Pill>;
}
