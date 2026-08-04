const assert = require('node:assert/strict');
const { createMember, listMembers, getMember, updateMember, deleteMember } = require('../src/memberService');

function run() {
  const initial = listMembers();
  const beforeCount = initial.length;

  const created = createMember({
    fullName: 'Amit Sharma',
    mobileNumber: '9876543210',
    joiningDate: '2026-08-01',
    membershipPlan: 'Monthly',
    membershipStartDate: '2026-08-01',
    membershipExpiryDate: '2026-09-01',
    assignedSeat: 'A1',
    status: 'Active',
  });

  assert.ok(created.id > 0, 'Expected created member to have an id');
  assert.equal(listMembers().length, beforeCount + 1);

  const fetched = getMember(created.id);
  assert.equal(fetched?.fullName, 'Amit Sharma');

  const updated = updateMember(created.id, { status: 'Expired' });
  assert.equal(updated.status, 'Expired');

  deleteMember(created.id);
  assert.equal(getMember(created.id), undefined);

  console.log('memberApi.test.js passed');
}

run();
