const assert = require('node:assert/strict');
const { createMember } = require('../src/memberService');
const { assignSeat, vacateSeat, getSeatLayout } = require('../src/seatService');

function run() {
  const member = createMember({
    fullName: 'Nina Rao',
    mobileNumber: '8888888888',
    joiningDate: '2026-08-01',
    membershipPlan: 'Monthly',
    membershipStartDate: '2026-08-01',
    membershipExpiryDate: '2026-09-01',
    assignedSeat: null,
    status: 'Active',
  });

  db = require('../src/db');
  db.prepare('UPDATE members SET assigned_seat = NULL WHERE assigned_seat = ?').run('A3');

  const assigned = assignSeat(member.id, 'A3');
  assert.equal(assigned.assignedSeat, 'A3');

  const layout = getSeatLayout();
  assert.ok(layout.some((seat) => seat.label === 'A3' && seat.memberId === member.id));

  const vacated = vacateSeat(member.id);
  assert.equal(vacated.assignedSeat, null);

  console.log('seatService.test.js passed');
}

run();
