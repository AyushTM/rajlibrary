const db = require('./db');

const PLAN_DURATIONS = {
  Monthly: 1,
  Quarterly: 3,
  'Half-Yearly': 6,
  Yearly: 12,
};

function normalizeMemberPayload(payload) {
  const plan = payload.membershipPlan?.trim();
  const monthlyDuration = payload.monthlyDuration ? Number(payload.monthlyDuration) : undefined;

  return {
    fullName: payload.fullName?.trim(),
    mobileNumber: payload.mobileNumber?.trim(),
    joiningDate: payload.joiningDate?.trim(),
    membershipPlan: plan,
    membershipStartDate: payload.membershipStartDate?.trim(),
    membershipExpiryDate: payload.membershipExpiryDate?.trim(),
    assignedSeat: payload.assignedSeat?.trim() || null,
    status: payload.status?.trim() || 'Active',
    monthlyDuration: monthlyDuration && monthlyDuration > 0 ? monthlyDuration : 1,
  };
}

function parseDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateExpiry(startDate, plan, monthlyDuration = 1) {
  const baseDate = parseDate(startDate);
  const months = plan === 'Monthly' ? monthlyDuration : PLAN_DURATIONS[plan] || 1;
  const newDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + months, baseDate.getDate());
  return formatDate(newDate);
}

function mapRow(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    mobileNumber: row.mobile_number,
    joiningDate: row.joining_date,
    membershipPlan: row.membership_plan,
    membershipStartDate: row.membership_start_date,
    membershipExpiryDate: row.membership_expiry_date,
    assignedSeat: row.assigned_seat,
    status: row.status,
    monthlyDuration: row.monthly_duration ?? 1,
  };
}

function mapRenewalRow(row) {
  return {
    id: row.id,
    memberId: row.member_id,
    previousExpiryDate: row.previous_expiry_date,
    renewalExpiryDate: row.renewal_expiry_date,
    newExpiryDate: row.new_expiry_date,
    membershipPlan: row.membership_plan,
    renewalDate: row.renewal_date,
    notes: row.notes,
  };
}

function createMember(payload) {
  const member = normalizeMemberPayload(payload);
  const startDate = member.membershipStartDate || member.joiningDate;
  const expiryDate = member.membershipExpiryDate || calculateExpiry(startDate, member.membershipPlan, member.monthlyDuration);
  const stmt = db.prepare(`
    INSERT INTO members (
      full_name,
      mobile_number,
      joining_date,
      membership_plan,
      membership_start_date,
      membership_expiry_date,
      assigned_seat,
      status,
      monthly_duration
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    member.fullName,
    member.mobileNumber,
    member.joiningDate,
    member.membershipPlan,
    startDate,
    expiryDate,
    member.assignedSeat,
    member.status,
    member.monthlyDuration,
  );

  const renewStmt = db.prepare(`
    INSERT INTO renewals (member_id, previous_expiry_date, renewal_expiry_date, new_expiry_date, membership_plan, renewal_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  renewStmt.run(
    info.lastInsertRowid,
    expiryDate,
    expiryDate,
    expiryDate,
    member.membershipPlan,
    member.joiningDate,
    'Initial membership entry',
  );

  return getMember(info.lastInsertRowid);
}

function listMembers() {
  const rows = db.prepare('SELECT * FROM members ORDER BY id DESC').all();
  return rows.map(mapRow);
}

function getMember(id) {
  const row = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  return row ? mapRow(row) : undefined;
}

function updateMember(id, updates) {
  const existing = getMember(id);
  if (!existing) {
    throw new Error('Member not found');
  }

  const member = normalizeMemberPayload({ ...existing, ...updates });
  const startDate = member.membershipStartDate || member.joiningDate;
  const expiryDate = member.membershipExpiryDate || calculateExpiry(startDate, member.membershipPlan, member.monthlyDuration);
  const stmt = db.prepare(`
    UPDATE members
    SET full_name = ?,
        mobile_number = ?,
        joining_date = ?,
        membership_plan = ?,
        membership_start_date = ?,
        membership_expiry_date = ?,
        assigned_seat = ?,
        status = ?,
        monthly_duration = ?
    WHERE id = ?
  `);

  stmt.run(
    member.fullName,
    member.mobileNumber,
    member.joiningDate,
    member.membershipPlan,
    startDate,
    expiryDate,
    member.assignedSeat,
    member.status,
    member.monthlyDuration,
    id,
  );

  return getMember(id);
}

function renewMembership(id, payload = {}) {
  const existing = getMember(id);
  if (!existing) {
    throw new Error('Member not found');
  }

  const plan = payload.membershipPlan?.trim() || existing.membershipPlan;
  const startDate = payload.membershipStartDate?.trim() || existing.membershipExpiryDate;
  const previousExpiryDate = existing.membershipExpiryDate;
  const newExpiryDate = calculateExpiry(startDate, plan, payload.monthlyDuration || existing.monthlyDuration || 1);

  updateMember(id, {
    membershipPlan: plan,
    membershipStartDate: startDate,
    membershipExpiryDate: newExpiryDate,
    monthlyDuration: payload.monthlyDuration || existing.monthlyDuration || 1,
    status: 'Active',
  });

  const renewStmt = db.prepare(`
    INSERT INTO renewals (member_id, previous_expiry_date, renewal_expiry_date, new_expiry_date, membership_plan, renewal_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  renewStmt.run(id, previousExpiryDate, newExpiryDate, newExpiryDate, plan, payload.renewalDate?.trim() || new Date().toISOString().slice(0, 10), payload.notes?.trim() || null);

  return getMember(id);
}

function listRenewals(memberId) {
  const rows = db.prepare('SELECT * FROM renewals WHERE member_id = ? ORDER BY id DESC').all(memberId);
  return rows.map(mapRenewalRow);
}

function deleteMember(id) {
  const stmt = db.prepare('DELETE FROM members WHERE id = ?');
  const info = stmt.run(id);
  return info.changes > 0;
}

module.exports = {
  createMember,
  listMembers,
  getMember,
  updateMember,
  deleteMember,
  renewMembership,
  listRenewals,
};
