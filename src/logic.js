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
  locked:    { cls: "status-locked",    label: "🔒 Agreed" },
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
    return requests.filter(r => r.lender_id === meId && r.status === "pending" && !r.lender_agreed).length;
  return requests.filter(r => r.borrower_id === meId && r.status === "pending" && !r.borrower_agreed).length;
}

export function needsMyAction(req, meId) {
  const isBorrower = req.borrower_id === meId;
  const myAgreed = isBorrower ? req.borrower_agreed : req.lender_agreed;
  return req.status === "pending" && !myAgreed;
}

export function willLockOnAgree(req, meId) {
  const isBorrower = req.borrower_id === meId;
  const theirAgreed = isBorrower ? req.lender_agreed : req.borrower_agreed;
  return req.status === "pending" && theirAgreed;
}
