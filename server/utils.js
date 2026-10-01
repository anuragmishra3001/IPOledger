const { Decimal, InvalidOperation } = require("decimal.js");

function formatINR(paise) {
  if (paise == null || Number.isNaN(paise)) return "₹0";
  const p = Number(paise);
  const rupees = Math.floor(p / 100);
  const rem = p % 100;
  let s = String(rupees);
  if (s.length > 3) {
    let head = s.slice(0, -3);
    const tail = s.slice(-3);
    const parts = [];
    while (head.length > 2) {
      parts.unshift(head.slice(-2));
      head = head.slice(0, -2);
    }
    if (head) parts.unshift(head);
    s = parts.join(",") + "," + tail;
  }
  return "₹" + s + (rem ? "." + String(rem).padStart(2, "0") : "");
}

function parseAmounts(text) {
  if (!text) throw new Error("Enter at least one amount.");
  const parts = text
    .trim()
    .split(/[,\s+]+/)
    .filter(Boolean);
  if (!parts.length) throw new Error("Enter at least one amount.");
  const out = [];
  for (const part of parts) {
    let d;
    try {
      d = new Decimal(part);
    } catch (_) {
      throw new Error(`'${part}' is not a valid amount.`);
    }
    if (
      !d.isFinite() ||
      d.lte(0) ||
      d.gt(new Decimal("100000000")) ||
      !d.eq(d.toDecimalPlaces(2))
    ) {
      throw new Error(
        `'${part}' must be a positive amount with at most 2 decimals.`
      );
    }
    out.push(parseInt(d.mul(100).toString(), 10));
  }
  return out;
}

function likeEscape(q) {
  return "%" + String(q).replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_") + "%";
}

module.exports = { formatINR, parseAmounts, likeEscape };
