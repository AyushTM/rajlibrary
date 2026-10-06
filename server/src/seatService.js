const db = require('./db');
const { getMember } = require('./memberService');

const SEAT_LAYOUT = [
  ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8'],
  ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'],
  ['B9', 'B10', 'B11', 'B12', 'B13', 'B14', 'B15', 'B16'],
  ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'],
  ['C8', 'C9', 'C10', 'C11', 'C12', 'C13', 'C14'],
  ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'],
  ['D8', 'D9', 'D10'],
];

const DISABLED_SEATS = new Set(['A8']);

function getSeatLayout() {
  return SEAT_LAYOUT.flatMap((row) => row.map((label) => {
    const seatMember = db.prepare('SELECT id, full_name, membership_expiry_date FROM members WHERE assigned_seat = ?').get(label);
    if (!seatMember) {
      return { label, status: 'available', memberId: null, memberName: null };
    }

    const today = new Date();
    const expiry = new Date(seatMember.membership_expiry_date);
    const diffDays = (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    const expiresSoon = diffDays <= 7 && diffDays >= 0;
    const isExpired = diffDays < 0;

    let status = 'occupied';
    if (isExpired) {
      status = 'expired';
    } else if (expiresSoon) {
      status = 'expiring';
    }
    if (DISABLED_SEATS.has(label)) {
      status = 'disabled';
    }

    return {
      label,
      status,
      memberId: seatMember.id,
      memberName: seatMember.full_name,
      membershipExpiryDate: seatMember.membership_expiry_date,
    };
  }));
}

function assignSeat(memberId, seatLabel, membershipStartDate, membershipExpiryDate) {
  const member = getMember(memberId);
  if (!member) {
    throw new Error('Member not found');
  }
  if (DISABLED_SEATS.has(seatLabel)) {
    throw new Error('Seat is disabled');
  }

  const existingSeat = db.prepare('SELECT id FROM members WHERE assigned_seat = ? AND id != ?').get(seatLabel, memberId);
  if (existingSeat) {
    throw new Error('Seat already assigned');
  }

  // Normalize optional date inputs into YYYY-MM-DD when possible. Treat invalid/missing as null.
  function normalizeToYMD(value) {
    if (!value) return null;
    // Accept plain YYYY-MM-DD or any ISO-ish date parseable by Date
    if (typeof value !== 'string') return null;
    // Trim whitespace
    const v = value.trim();
    // If already in YYYY-MM-DD, accept directly
    const ymdMatch = /^\d{4}-\d{2}-\d{2}$/.test(v);
    if (ymdMatch) return v;
    // Try to parse via Date
    const parsed = new Date(v);
    if (Number.isNaN(parsed.getTime())) return null;
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const startDateParam = normalizeToYMD(membershipStartDate);
  const expiryDateParam = normalizeToYMD(membershipExpiryDate);

  // Update assigned seat and override membership dates when valid values are provided.
  // If both start and expiry dates are provided, mark member as Active (same rule as payments).
  db.prepare(`
    UPDATE members SET
      assigned_seat = ?,
      membership_start_date = CASE WHEN ? IS NOT NULL THEN ? ELSE membership_start_date END,
      membership_expiry_date = CASE WHEN ? IS NOT NULL THEN ? ELSE membership_expiry_date END,
      status = CASE WHEN ? IS NOT NULL AND ? IS NOT NULL THEN 'Active' ELSE status END
    WHERE id = ?
  `).run(seatLabel, startDateParam, startDateParam, expiryDateParam, expiryDateParam, startDateParam, expiryDateParam, memberId);

  // Return the fresh member record
  const updated = getMember(memberId);
  // Log for diagnostics when running locally
  try {
    console.log('[seatService] assignSeat:', { memberId, seatLabel, membershipStartDate: startDateParam, membershipExpiryDate: expiryDateParam, updatedExpiry: updated.membershipExpiryDate })
  } catch (e) {
    // ignore
  }

  return { ...updated, assignedSeat: updated.assignedSeat };
}

function vacateSeat(memberId) {
  const member = getMember(memberId);
  if (!member) {
    throw new Error('Member not found');
  }

  db.prepare('UPDATE members SET assigned_seat = NULL WHERE id = ?').run(memberId);
  return { ...member, assignedSeat: null };
}

module.exports = {
  getSeatLayout,
  assignSeat,
  vacateSeat,
};
