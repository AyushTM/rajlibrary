const assert = require('node:assert/strict');
const db = require('../src/db');
const { getMemberByPhone } = require('../src/memberService');
const { normalizeIndianPhoneNumber } = require('../src/phoneUtils');

function run() {
  assert.equal(normalizeIndianPhoneNumber('9876543210'), '919876543210');
  assert.equal(normalizeIndianPhoneNumber('+91 9876543210'), '919876543210');
  assert.equal(normalizeIndianPhoneNumber('919876543210'), '919876543210');
  assert.equal(normalizeIndianPhoneNumber('91-98765-43210'), '919876543210');

  const insertMember = db.prepare(`
    INSERT INTO members (
      full_name,
      mobile_number,
      email,
      adhaar_number,
      joining_date,
      membership_plan,
      membership_start_date,
      membership_expiry_date,
      assigned_seat,
      status,
      monthly_duration
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = insertMember.run(
    'Legacy Phone Lookup',
    '9425669999',
    null,
    null,
    '2026-08-01',
    'Monthly',
    '2026-08-01',
    '2026-09-01',
    null,
    'Active',
    1,
  );

  try {
    assert.equal(getMemberByPhone('9425669999')?.id, info.lastInsertRowid);
    assert.equal(getMemberByPhone('+91 9425669999')?.id, info.lastInsertRowid);
    assert.equal(getMemberByPhone('919425669999')?.id, info.lastInsertRowid);
    assert.equal(getMemberByPhone('91 9425669999')?.id, info.lastInsertRowid);
  } finally {
    db.prepare('DELETE FROM members WHERE id = ?').run(info.lastInsertRowid);
  }

  console.log('phoneNormalization.test.js passed');
}

run();
