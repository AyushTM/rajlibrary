const db = require('./db');
const { getMember } = require('./memberService');
const { assignSeat } = require('./seatService');

function createReceiptNumber() {
  const row = db.prepare('SELECT MAX(id) AS maxId FROM payments').get();
  const nextId = (row?.maxId || 0) + 1;
  return `RDL-${String(nextId).padStart(6, '0')}`;
}

function createPayment(payload) {
  const member = getMember(payload.memberId);
  if (!member) {
    throw new Error('Member not found');
  }

  const amount = Number(payload.amount);
  const paymentDate = payload.paymentDate?.trim();
  const paymentMethod = payload.paymentMethod?.trim();
  const receiptNumber = payload.receiptNumber?.trim() || createReceiptNumber();
  const seatLabel = payload.seatLabel?.trim();
  const membershipPlan = payload.membershipPlan?.trim() || member.membershipPlan || 'Monthly';
  const membershipStartDate = payload.membershipStartDate?.trim() || member.membershipStartDate;
  const membershipExpiryDate = payload.membershipExpiryDate?.trim() || member.membershipExpiryDate;

  if (!paymentDate || !paymentMethod || Number.isNaN(amount) || !membershipStartDate || !membershipExpiryDate) {
    throw new Error('Please complete the membership dates before recording payment');
  }

  const stmt = db.prepare(`
    INSERT INTO payments (member_id, membership_plan, membership_start_date, membership_expiry_date, assigned_seat, amount, payment_date, payment_method, receipt_number, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  if (seatLabel) {
    assignSeat(member.id, seatLabel);
  }

  const info = stmt.run(
    member.id,
    membershipPlan,
    membershipStartDate,
    membershipExpiryDate,
    seatLabel || member.assignedSeat || null,
    amount,
    paymentDate,
    paymentMethod,
    receiptNumber,
    payload.notes?.trim() || null,
    new Date().toISOString(),
  );

  db.prepare(`
    UPDATE members
    SET membership_plan = ?, membership_start_date = ?, membership_expiry_date = ?, assigned_seat = ?, status = 'Active'
    WHERE id = ?
  `).run(membershipPlan, membershipStartDate, membershipExpiryDate, seatLabel || member.assignedSeat || null, member.id);

  return getPayment(info.lastInsertRowid);
}

function getPayment(id) {
  const row = db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
  return row ? mapRow(row) : undefined;
}

function listPayments() {
  const rows = db.prepare('SELECT * FROM payments ORDER BY id DESC').all();
  return rows.map(mapRow);
}

function getPaymentsByMemberId(memberId) {
  const rows = db.prepare('SELECT * FROM payments WHERE member_id = ? ORDER BY id DESC').all(memberId);
  return rows.map(mapRow);
}

function getReceiptByPaymentId(paymentId) {
  const row = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
  if (!row) {
    return undefined;
  }

  const member = getMember(row.member_id);
  return {
    id: row.id,
    receiptNumber: row.receipt_number,
    paymentDate: row.payment_date,
    memberId: row.member_id,
    memberName: member?.fullName,
    mobileNumber: member?.mobileNumber,
    assignedSeat: member?.assignedSeat,
    membershipPlan: row.membership_plan,
    membershipStartDate: row.membership_start_date,
    membershipExpiryDate: row.membership_expiry_date,
    amount: row.amount,
    paymentMethod: row.payment_method,
    notes: row.notes,
  };
}

function mapRow(row) {
  return {
    id: row.id,
    memberId: row.member_id,
    membershipPlan: row.membership_plan,
    membershipStartDate: row.membership_start_date,
    membershipExpiryDate: row.membership_expiry_date,
    amount: row.amount,
    paymentDate: row.payment_date,
    paymentMethod: row.payment_method,
    receiptNumber: row.receipt_number,
    notes: row.notes,
    createdAt: row.created_at,
    assignedSeat: row.assigned_seat,
  };
}

module.exports = {
  createPayment,
  listPayments,
  getPaymentsByMemberId,
  getReceiptByPaymentId,
};
