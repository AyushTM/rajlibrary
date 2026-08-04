const assert = require('node:assert/strict');
const { createMember } = require('../src/memberService');
const { createPayment, getReceiptByPaymentId } = require('../src/paymentService');

function run() {
  const member = createMember({
    fullName: 'Suresh Das',
    mobileNumber: '6666666666',
    joiningDate: '2026-08-01',
    membershipPlan: 'Monthly',
    membershipStartDate: '2026-08-01',
    membershipExpiryDate: '2026-09-01',
    assignedSeat: 'A5',
    status: 'Active',
    monthlyDuration: 1,
  });

  const payment = createPayment({
    memberId: member.id,
    amount: 1000,
    paymentDate: '2026-08-01',
    paymentMethod: 'UPI',
    receiptNumber: null,
    notes: 'Test payment',
  });

  assert.ok(payment.receiptNumber.startsWith('RDL-'));
  assert.equal(getReceiptByPaymentId(payment.id).receiptNumber, payment.receiptNumber);

  console.log('receiptService.test.js passed');
}

run();
