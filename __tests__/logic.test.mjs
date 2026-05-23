import { describe, it, expect } from "vitest";
import {
  CONDITION_OPTIONS, STATUS_INFO,
  conditionLabel, formatDate,
  filterRequests, pendingBadgeCount,
  needsMyAction, willLockOnAgree,
} from "../src/logic.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function req(overrides = {}) {
  return {
    id: "r1",
    item_name: "Blue Dress",
    borrower_id: "u1",
    lender_id: "u2",
    status: "pending",
    borrower_agreed: false,
    lender_agreed: false,
    needed_date: "2025-06-01",
    return_date: "2025-06-07",
    return_condition: [],
    ...overrides,
  };
}

// ── conditionLabel ────────────────────────────────────────────────────────────

describe("conditionLabel", () => {
  it("returns the label for a known condition value", () => {
    expect(conditionLabel("washed")).toBe("Washed / Laundered");
    expect(conditionLabel("dry-cleaned")).toBe("Dry-cleaned");
    expect(conditionLabel("as-is")).toBe("As-is (no condition)");
  });

  it("returns the raw value when unrecognized", () => {
    expect(conditionLabel("unknown-value")).toBe("unknown-value");
  });

  it("covers all entries in CONDITION_OPTIONS", () => {
    for (const opt of CONDITION_OPTIONS) {
      expect(conditionLabel(opt.value)).toBe(opt.label);
    }
  });
});

// ── STATUS_INFO ───────────────────────────────────────────────────────────────

describe("STATUS_INFO", () => {
  it("has entries for all four statuses", () => {
    for (const status of ["pending", "locked", "returned", "cancelled"]) {
      expect(STATUS_INFO[status]).toBeDefined();
      expect(STATUS_INFO[status].cls).toBeTruthy();
      expect(STATUS_INFO[status].label).toBeTruthy();
    }
  });
});

// ── formatDate ────────────────────────────────────────────────────────────────

describe("formatDate", () => {
  it("formats a valid ISO date string", () => {
    expect(formatDate("2025-06-01")).toMatch(/Jun 1, 2025/);
  });

  it("returns an em-dash for empty string", () => {
    expect(formatDate("")).toBe("—");
  });

  it("returns an em-dash for null/undefined", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });

  it("handles date at year boundary", () => {
    expect(formatDate("2025-01-01")).toMatch(/Jan 1, 2025/);
    expect(formatDate("2025-12-31")).toMatch(/Dec 31, 2025/);
  });
});

// ── filterRequests ────────────────────────────────────────────────────────────

describe("filterRequests", () => {
  const ME = "u2";
  const requests = [
    req({ id: "a", lender_id: ME, borrower_id: "u1", status: "pending" }),
    req({ id: "b", lender_id: ME, borrower_id: "u1", status: "locked" }),
    req({ id: "c", lender_id: ME, borrower_id: "u1", status: "cancelled" }),
    req({ id: "d", borrower_id: ME, lender_id: "u1", status: "pending" }),
    req({ id: "e", borrower_id: ME, lender_id: "u1", status: "returned" }),
    req({ id: "f", borrower_id: "u3", lender_id: "u1", status: "pending" }),
  ];

  it("returns non-cancelled requests where I am the lender", () => {
    const result = filterRequests(requests, ME, "for-me");
    expect(result.map(r => r.id)).toEqual(["a", "b"]);
  });

  it("returns non-cancelled requests where I am the borrower", () => {
    const result = filterRequests(requests, ME, "from-me");
    expect(result.map(r => r.id)).toEqual(["d", "e"]);
  });

  it("returns empty array when I have no requests", () => {
    expect(filterRequests(requests, "nobody", "for-me")).toEqual([]);
    expect(filterRequests(requests, "nobody", "from-me")).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const copy = [...requests];
    filterRequests(requests, ME, "for-me");
    expect(requests).toEqual(copy);
  });
});

// ── pendingBadgeCount ─────────────────────────────────────────────────────────

describe("pendingBadgeCount", () => {
  const ME = "u2";

  it("counts pending requests where I (lender) have not agreed", () => {
    const requests = [
      req({ lender_id: ME, status: "pending", lender_agreed: false }),
      req({ lender_id: ME, status: "pending", lender_agreed: true }),
      req({ lender_id: ME, status: "locked",  lender_agreed: true }),
    ];
    expect(pendingBadgeCount(requests, ME, "for-me")).toBe(1);
  });

  it("counts pending requests where I (borrower) have not agreed", () => {
    const requests = [
      req({ borrower_id: ME, status: "pending", borrower_agreed: false }),
      req({ borrower_id: ME, status: "pending", borrower_agreed: true }),
    ];
    expect(pendingBadgeCount(requests, ME, "from-me")).toBe(1);
  });

  it("returns 0 when all pending requests are already agreed by me", () => {
    const requests = [
      req({ lender_id: ME, status: "pending", lender_agreed: true }),
      req({ lender_id: ME, status: "locked",  lender_agreed: true }),
    ];
    expect(pendingBadgeCount(requests, ME, "for-me")).toBe(0);
  });

  it("returns 0 for empty list", () => {
    expect(pendingBadgeCount([], ME, "for-me")).toBe(0);
  });
});

// ── needsMyAction ─────────────────────────────────────────────────────────────

describe("needsMyAction", () => {
  it("returns true when I am the borrower and have not agreed", () => {
    expect(needsMyAction(req({ borrower_agreed: false }), "u1")).toBe(true);
  });

  it("returns false when I am the borrower and have already agreed", () => {
    expect(needsMyAction(req({ borrower_agreed: true }), "u1")).toBe(false);
  });

  it("returns true when I am the lender and have not agreed", () => {
    expect(needsMyAction(req({ lender_agreed: false }), "u2")).toBe(true);
  });

  it("returns false when I am the lender and have already agreed", () => {
    expect(needsMyAction(req({ lender_agreed: true }), "u2")).toBe(false);
  });

  it("returns false when status is not pending", () => {
    expect(needsMyAction(req({ status: "locked" }), "u1")).toBe(false);
    expect(needsMyAction(req({ status: "returned" }), "u1")).toBe(false);
  });
});

// ── willLockOnAgree ───────────────────────────────────────────────────────────

describe("willLockOnAgree", () => {
  it("returns true when I am borrower and lender already agreed", () => {
    expect(willLockOnAgree(req({ lender_agreed: true }), "u1")).toBe(true);
  });

  it("returns false when I am borrower and lender has not agreed", () => {
    expect(willLockOnAgree(req({ lender_agreed: false }), "u1")).toBe(false);
  });

  it("returns true when I am lender and borrower already agreed", () => {
    expect(willLockOnAgree(req({ borrower_agreed: true }), "u2")).toBe(true);
  });

  it("returns false when I am lender and borrower has not agreed", () => {
    expect(willLockOnAgree(req({ borrower_agreed: false }), "u2")).toBe(false);
  });

  it("returns false when status is not pending", () => {
    expect(willLockOnAgree(req({ status: "locked", lender_agreed: true }), "u1")).toBe(false);
  });
});
