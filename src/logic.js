/**
 * Pure business logic for the Borrowing app.
 * No DOM, no fetch — importable in both browser and test environments.
 */

export const CONDITION_OPTIONS = [
  { value: "dry-cleaned",  label: "Dry-cleaned" },
  { value: "washed",       label: "Washed / Laundered" },
  { value: "disinfected",  label: "Disinfected / Sanitized" },
  { value: "ironed",       label: "Ironed / Pressed" },
  { value: "original-pkg", label: "In original packaging" },
  { value: "as-is",        label: "As-is (no condition)" },
];

export const STATUS_INFO = {
  pending:   { cls: "status-pending",   label: "Pending" },
  locked:    { cls: "status-locked",    label: "Agreed", glyph: "lock" },
  returned:  { cls: "status-returned",  label: "Returned" },
  cancelled: { cls: "status-cancelled", label: "Cancelled" },
};

export function conditionLabel(value) {
  return CONDITION_OPTIONS.find(o => o.value === value)?.label ?? value;
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function filterRequests(requests, meId, tab) {
  if (tab === "for-me") return requests.filter(r => r.lender_id === meId && r.status !== "cancelled");
  return requests.filter(r => r.borrower_id === meId && r.status !== "cancelled");
}

export function pendingBadgeCount(requests, meId, tab) {
  if (tab === "for-me")
    return requests.filter(r => r.lender_id === meId && r.status === "pending" && !r.lender_agreed && !waitingOnTheirReview(r, meId)).length;
  return requests.filter(r => r.borrower_id === meId && r.status === "pending" && !r.borrower_agreed && !waitingOnTheirReview(r, meId)).length;
}

/**
 * The other party's agreement is on record for terms that have since been
 * edited (`*_outdated`). The hub holds a request to the terms of its first
 * standing agreement and only that party can take theirs off, so they have
 * to agree to the new terms before this member can. Not when this member's
 * own agreement is outdated too: then taking it off is theirs to do.
 */
export function waitingOnTheirReview(req, meId) {
  const isBorrower = req.borrower_id === meId;
  const theirOutdated = isBorrower ? req.lender_outdated : req.borrower_outdated;
  const myOutdated = isBorrower ? req.borrower_outdated : req.lender_outdated;
  return req.status === "pending" && !!theirOutdated && !myOutdated;
}

export function needsMyAction(req, meId) {
  const isBorrower = req.borrower_id === meId;
  const myAgreed = isBorrower ? req.borrower_agreed : req.lender_agreed;
  return req.status === "pending" && !myAgreed && !waitingOnTheirReview(req, meId);
}

export function willLockOnAgree(req, meId) {
  const isBorrower = req.borrower_id === meId;
  const theirAgreed = isBorrower ? req.lender_agreed : req.borrower_agreed;
  return req.status === "pending" && theirAgreed;
}

/**
 * Fields the in-app search matches against (see hub-sdk `searchMatch`).
 * The item description and the return terms count as well as the
 * item's name — "the drill I said I'd bring back Sunday" is in the
 * terms, not the title.
 */
export function searchableFields(item) {
  return [item.item_name, item.item_description, item.return_condition, item.if_not_returned];
}

// ── Retry after a lost response (app-template guide) ─────────────────────────

/**
 * Whether a failed create's answer leaves its outcome unknown — no status, a
 * 400, or a 5xx other than 507 — so the page reads the row back by its pinned
 * id. A `UNIQUE_CONSTRAINT` answer is a 400 too: the usual retry of a create
 * that landed collides on its own pinned id. Only finding the row under that
 * id says it landed.
 */
export function outcomeUnknown(e) {
  if (e?.code === "UNIQUE_CONSTRAINT" || /UNIQUE constraint failed/i.test(String(e?.message ?? ""))) return true;
  const status = Number(e?.status) || 0;
  return status === 0 || status === 400 || (status >= 500 && status !== 507);
}

/**
 * Whether a stored row differs from what the form holds now, over the form's
 * own fields only, compared as text with a missing value as empty.
 */
export function storedDiffers(row, fields) {
  return Object.keys(fields).some((k) => String(row?.[k] ?? "") !== String(fields[k] ?? ""));
}

export const SAVED_AS_FIRST = "Saved as first entered — check it and update what changed.";

/**
 * The line a failed write shows ("Refused, gone, or failed" in the app-template
 * guide): "try again" only when retrying can work. `action` and `thing` are the
 * app's own words. `found` is the caller's re-read after a write that changed
 * nothing: false = the row is gone, true = it is still there, null = the
 * re-read failed. A row still there after a plain `WHERE id = ?` write means
 * the row policy refused it; only a `guarded` write (one with a state
 * condition) can have been "changed by someone else". Decided from the error's
 * `status` / `code`, never from the hub's or the browser's text.
 */
export function failureLine(e, { action, thing, found, guarded = false } = {}) {
  if (e?.forUser) return e.message;
  if (e?.code === "UNIQUE_CONSTRAINT" || /UNIQUE constraint failed/i.test(String(e?.message ?? ""))) return `That ${thing} already exists.`;
  if (e?.status === 403 || (found === true && !guarded)) return `You don’t have permission to ${action}.`;
  if (e?.status === 507) return "The household’s storage is full — free up space first.";
  if (e?.status === 429) return "Too many tries — wait a minute and try again.";
  if (found === null) return `Couldn’t ${action} — try again.`;
  if (found === false || (found === undefined && e?.status === 404)) return `This ${thing} has been removed.`;
  if (found === true || e?.status === 409) return `This ${thing} was changed by someone else — check it first.`;
  return `Couldn’t ${action} — try again.`;
}
