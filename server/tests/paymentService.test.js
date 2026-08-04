const assert = require('node:assert/strict');
const { createMember } = require('../src/memberService');
const { createPayment, listPayments, getPaymentsByMemberId } = require('../src/paymentService');

function run() {
  const member = createMember({
    fullName: 'Priya Nair',
    mobileNumber: '7777777777',
    joiningDate: '2026-08-01',
    membershipPlan: 'Monthly',
    membershipStartDate: '2026-08-01',
    membershipExpiryDate: '2026-09-01',
    assignedSeat: 'A4',
    status: 'Active',
  });

  const payment = createPayment({
    memberId: member.id,
    amount: 1500,
    paymentDate: '2026-08-01',
    paymentMethod: 'Cash',
    receiptNumber: 'RCPT-1001',
    seatLabel: 'A3',
    notes: 'Initial payment',
  });

  assert.equal(payment.amount, 1500);
  assert.equal(listPayments().length, 1);
  assert.equal(getPaymentsByMemberId(member.id).length, 1);
  assert.equal(getPaymentsByMemberId(member.id)[0].assignedSeat, 'A3');

  console.log('paymentService.test.js passed');
}

run();
