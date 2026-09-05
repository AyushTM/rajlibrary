const assert = require('node:assert/strict');
const { createMember } = require('../src/memberService');
const { createPayment } = require('../src/paymentService');
const { resetAllData } = require('../src/resetService');

function run() {
  createMember({
    fullName: 'Reset Test User',
    mobileNumber: '9999999999',
    joiningDate: '2026-08-01',
    membershipPlan: 'Monthly',
    membershipStartDate: '2026-08-01',
    membershipExpiryDate: '2026-09-01',
    assignedSeat: 'A1',
    status: 'Active',
  });

  createPayment({
    memberId: 1,
    amount: 500,
    paymentDate: '2026-08-01',
    paymentMethod: 'Cash',
    membershipPlan: 'Monthly',
    membershipStartDate: '2026-08-01',
    membershipExpiryDate: '2026-09-01',
    seatLabel: 'A1',
    notes: 'Initial test payment',
  });

  resetAllData();

  assert.equal(require('../src/memberService').listMembers().length, 0, 'Expected members to be cleared');
  assert.equal(require('../src/paymentService').listPayments().length, 0, 'Expected payments to be cleared');

  console.log('resetData.test.js passed');
}

run();
