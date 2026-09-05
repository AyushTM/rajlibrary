const assert = require('node:assert/strict');
const { createMember, renewMembership, listRenewals } = require('../src/memberService');

function run() {
  const created = createMember({
    fullName: 'Ravi Verma',
    mobileNumber: '9999999999',
    email: 'ravi@example.com',
    adhaarNumber: '123456789012',
    joiningDate: '2026-08-01',
    membershipPlan: 'Monthly',
    membershipStartDate: '2026-08-01',
    assignedSeat: 'A2',
    status: 'Active',
  });

  assert.equal(created.email, 'ravi@example.com');
  assert.equal(created.adhaarNumber, '123456789012');

  assert.equal(created.membershipExpiryDate, '2026-09-01');

  const pendingMember = createMember({
    fullName: 'Kavya Singh',
    mobileNumber: '7777777777',
    joiningDate: '2026-08-02',
    membershipPlan: 'Monthly',
    membershipStartDate: '2026-08-02',
  });

  assert.equal(pendingMember.status, 'Pending');

  const renewed = renewMembership(created.id, {
    membershipPlan: 'Yearly',
    membershipStartDate: '2026-09-01',
  });

  assert.equal(renewed.membershipExpiryDate, '2027-09-01');
  assert.equal(listRenewals(created.id).length, 2);

  console.log('membershipService.test.js passed');
}

run();
