const assert = require('node:assert/strict');
const { buildReportStats } = require('../src/reportService');

function run() {
  const members = [
    {
      id: 1,
      fullName: 'Amit Sharma',
      mobileNumber: '9876543210',
      joiningDate: '2026-08-01',
      membershipPlan: 'Monthly',
      membershipStartDate: '2026-08-01',
      membershipExpiryDate: '2026-08-10',
      assignedSeat: 'A1',
      status: 'Active',
    },
    {
      id: 2,
      fullName: 'Priya Rao',
      mobileNumber: '9123456789',
      joiningDate: '2026-08-02',
      membershipPlan: 'Quarterly',
      membershipStartDate: '2026-08-02',
      membershipExpiryDate: '2026-09-02',
      assignedSeat: null,
      status: 'Pending',
    },
  ];

  const payments = [
    { id: 1, memberId: 1, amount: 1200, paymentDate: '2026-08-01', paymentMethod: 'UPI' },
    { id: 2, memberId: 2, amount: 3500, paymentDate: '2026-08-03', paymentMethod: 'Cash' },
  ];

  const report = buildReportStats(members, payments);

  assert.equal(report.totalMembers, 2);
  assert.equal(report.activeMembers, 1);
  assert.equal(report.pendingMembers, 1);
  assert.ok(report.revenueByMonth.length >= 1);
  assert.ok(report.revenueByMonth.some((entry) => entry.revenue >= 1200));
  assert.ok(report.statusBreakdown.some((entry) => entry.label === 'Active' && entry.count === 1));

  console.log('reportService.test.js passed');
}

run();
