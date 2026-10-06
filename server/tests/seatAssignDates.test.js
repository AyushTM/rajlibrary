const assert = require('node:assert/strict');
const { createMember, getMember } = require('../src/memberService');
const { assignSeat } = require('../src/seatService');

function run() {
  const member = createMember({
    fullName: 'Date Test',
    mobileNumber: '9999999999',
    joiningDate: '2026-09-01',
    membershipPlan: 'Monthly',
    membershipStartDate: '2026-09-01',
    membershipExpiryDate: '2026-10-01',
    assignedSeat: null,
    status: 'Active',
  });

  // Assign seat with a short custom period
  const updated = assignSeat(member.id, 'B1', '2026-09-07', '2026-09-24');
  const fetched = getMember(member.id);
  assert.equal(fetched.membershipStartDate, '2026-09-07');
  assert.equal(fetched.membershipExpiryDate, '2026-09-24');
  console.log('seatAssignDates.test.js passed');
}

run();
