// Keyword search shared by the Call Center Help and Setup pages.
// Every word typed must match, and common everyday words also match the app's own terms
// (typing "classify" finds outcomes, categories, reasons, statuses and stages).
const CLASSIFY = ["outcome", "category", "reason", "type", "status", "stage", "priority", "lifecycle"];

const SYNONYMS: Record<string, string[]> = {
  classify: CLASSIFY,
  categorize: CLASSIFY,
  categorise: CLASSIFY,
  label: ["outcome", "category", "reason", "type", "status", "stage"],
  tag: ["outcome", "category", "reason", "type", "status", "stage", "custom field"],
  result: ["outcome", "resolution"],
  ticket: ["case"],
  issue: ["case", "problem"],
  problem: ["case"],
  remind: ["callback", "task", "due"],
  reminder: ["callback", "task", "due"],
  phone: ["call", "callback", "cxone", "screen pop"],
  text: ["sms"],
  message: ["sms", "email"],
  dupe: ["duplicate", "merge"],
  duplicate: ["merge"],
  stop: ["do not contact", "opt", "consent"],
  unsubscribe: ["do not contact", "consent"],
  optout: ["do not contact", "consent"],
  family: ["relationship", "parent", "guardian", "behalf"],
  parent: ["relationship", "behalf"],
  student: ["contact", "interest", "enrolled"],
  lead: ["contact", "interest", "journey", "follow-up"],
  assign: ["owner", "queue", "pick up"],
  owner: ["assigned", "pick up"],
  field: ["custom field"],
  form: ["rfi"],
  survey: ["rfi"],
  send: ["handoff", "personal link"],
  pass: ["handoff"],
  escalate: ["escalations", "case", "priority"],
  late: ["overdue", "stalled"],
  waitlist: ["coming soon", "interest"],
};

export function makeMatcher(query: string): (text: string) => boolean {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return () => true;
  return (text: string) => {
    const t = text.toLowerCase();
    return tokens.every((w) => t.includes(w) || (SYNONYMS[w] || []).some((s) => t.includes(s)));
  };
}
