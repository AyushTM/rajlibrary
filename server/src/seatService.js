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

    let status = 'occupied';
    if (expiresSoon) {
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

function assignSeat(memberId, seatLabel) {
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

  db.prepare('UPDATE members SET assigned_seat = ? WHERE id = ?').run(seatLabel, memberId);
  return { ...member, assignedSeat: seatLabel };
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
