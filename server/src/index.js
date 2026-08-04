const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const cors = require('cors');
const db = require('./db');
const { createMember, listMembers, getMember, updateMember, deleteMember, renewMembership, listRenewals } = require('./memberService');
const { assignSeat, vacateSeat, getSeatLayout } = require('./seatService');
const { createPayment, listPayments, getPaymentsByMemberId, getReceiptByPaymentId } = require('./paymentService');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/members', (req, res) => {
  res.json(listMembers());
});

app.post('/api/members', (req, res) => {
  try {
    const member = createMember(req.body);
    res.status(201).json(member);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/members/:id', (req, res) => {
  const member = getMember(Number(req.params.id));
  if (!member) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  res.json(member);
});

app.put('/api/members/:id', (req, res) => {
  try {
    const member = updateMember(Number(req.params.id), req.body);
    res.json(member);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.delete('/api/members/:id', (req, res) => {
  const deleted = deleteMember(Number(req.params.id));
  if (!deleted) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  res.status(204).send();
});

app.post('/api/members/:id/renewals', (req, res) => {
  try {
    const member = renewMembership(Number(req.params.id), req.body);
    res.status(201).json(member);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.get('/api/members/:id/renewals', (req, res) => {
  res.json(listRenewals(Number(req.params.id)));
});

app.get('/api/seats', (req, res) => {
  res.json(getSeatLayout());
});

app.post('/api/seats/assign', (req, res) => {
  try {
    const seat = assignSeat(req.body.memberId, req.body.seatLabel);
    res.json(seat);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/seats/vacate', (req, res) => {
  try {
    const seat = vacateSeat(req.body.memberId);
    res.json(seat);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/payments', (req, res) => {
  res.json(listPayments());
});

app.get('/api/payments/:memberId', (req, res) => {
  res.json(getPaymentsByMemberId(Number(req.params.memberId)));
});

app.get('/api/payments/receipt/:paymentId', (req, res) => {
  const receipt = getReceiptByPaymentId(Number(req.params.paymentId));
  res.json(receipt);
});

app.post('/api/payments', (req, res) => {
  try {
    const payment = createPayment(req.body);
    res.status(201).json(payment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/dashboard', (req, res) => {
  const members = listMembers();
  const payments = listPayments();
  const today = new Date();
  const activeMembers = members.filter((member) => member.status === 'Active').length;
  const expiredMembers = members.filter((member) => member.status === 'Expired').length;
  const expiringSoon = members.filter((member) => {
    const expiryDate = new Date(member.membershipExpiryDate);
    const diff = (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7 && diff >= 0;
  }).length;
  const occupiedSeats = members.filter((member) => member.assignedSeat).length;
  const availableSeats = 48 - occupiedSeats;
  const monthlyRevenue = payments.reduce((total, payment) => total + payment.amount, 0);

  res.json({
    activeMembers,
    expiredMembers,
    expiringSoon,
    occupiedSeats,
    availableSeats,
    monthlyRevenue,
  });
});

app.get('/api/reports', (req, res) => {
  const members = listMembers();
  const payments = listPayments();
  const today = new Date();

  const expiringSoon = members.filter((member) => {
    const expiryDate = new Date(member.membershipExpiryDate);
    const diff = (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7 && diff >= 0;
  });

  res.json({
    totalMembers: members.length,
    activeMembers: members.filter((member) => member.status === 'Active').length,
    expiredMembers: members.filter((member) => member.status === 'Expired').length,
    pendingMembers: members.filter((member) => member.status === 'Pending').length,
    occupiedSeats: members.filter((member) => member.assignedSeat).length,
    availableSeats: 48 - members.filter((member) => member.assignedSeat).length,
    monthlyRevenue: payments.reduce((total, payment) => total + payment.amount, 0),
    expiringSoon,
    recentPayments: payments.slice(0, 10),
  });
});

app.get('/api/backup', (req, res) => {
  const backupPath = path.resolve(__dirname, '../../data/raj-digital-library.backup.json');
  const payload = {
    exportedAt: new Date().toISOString(),
    members: listMembers(),
    payments: listPayments(),
    renewals: db.prepare('SELECT * FROM renewals ORDER BY id').all(),
  };

  fs.writeFileSync(backupPath, JSON.stringify(payload, null, 2));
  res.download(backupPath, 'raj-digital-library-backup.json');
});

app.post('/api/restore', (req, res) => {
  try {
    const backup = req.body;
    if (!backup || !Array.isArray(backup.members) || !Array.isArray(backup.payments)) {
      res.status(400).json({ error: 'Invalid backup payload' });
      return;
    }

    db.exec('DELETE FROM payments');
    db.exec('DELETE FROM renewals');
    db.exec('DELETE FROM members');

    const insertMember = db.prepare(`
      INSERT INTO members (
        id, full_name, mobile_number, joining_date, membership_plan, membership_start_date, membership_expiry_date, assigned_seat, status, monthly_duration
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertRenewal = db.prepare(`
      INSERT INTO renewals (id, member_id, previous_expiry_date, renewal_expiry_date, new_expiry_date, membership_plan, renewal_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertPayment = db.prepare(`
      INSERT INTO payments (
        id, member_id, membership_plan, membership_start_date, membership_expiry_date, assigned_seat, amount, payment_date, payment_method, receipt_number, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const member of backup.members) {
      insertMember.run(
        member.id,
        member.fullName,
        member.mobileNumber,
        member.joiningDate,
        member.membershipPlan,
        member.membershipStartDate,
        member.membershipExpiryDate,
        member.assignedSeat,
        member.status,
        member.monthlyDuration ?? 1,
      );
    }

    for (const renewal of backup.renewals || []) {
      insertRenewal.run(
        renewal.id,
        renewal.member_id,
        renewal.previous_expiry_date,
        renewal.renewal_expiry_date,
        renewal.new_expiry_date,
        renewal.membership_plan,
        renewal.renewal_date,
        renewal.notes,
      );
    }

    for (const payment of backup.payments) {
      insertPayment.run(
        payment.id,
        payment.memberId,
        payment.membershipPlan,
        payment.membershipStartDate,
        payment.membershipExpiryDate,
        payment.assignedSeat,
        payment.amount,
        payment.paymentDate,
        payment.paymentMethod,
        payment.receiptNumber,
        payment.notes,
        payment.createdAt,
      );
    }

    res.json({ status: 'ok' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
