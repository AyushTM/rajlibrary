function buildReportStats(members = [], payments = []) {
  const today = new Date();
  const expiringSoon = members.filter((member) => {
    const expiryDate = new Date(member.membershipExpiryDate);
    const diff = (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7 && diff >= 0;
  });

  const revenueByMonth = payments.reduce((acc, payment) => {
    const label = payment.paymentDate ? payment.paymentDate.slice(0, 7) : 'Unknown';
    const entry = acc.find((item) => item.label === label);
    if (entry) {
      entry.revenue += Number(payment.amount || 0);
      entry.members += 1;
    } else {
      acc.push({ label, revenue: Number(payment.amount || 0), members: 1 });
    }
    return acc;
  }, []);

  const statusBreakdown = ['Active', 'Pending', 'Expired'].map((label) => ({
    label,
    count: members.filter((member) => member.status === label).length,
  }));

  return {
    totalMembers: members.length,
    activeMembers: members.filter((member) => member.status === 'Active').length,
    expiredMembers: members.filter((member) => member.status === 'Expired').length,
    pendingMembers: members.filter((member) => member.status === 'Pending').length,
    occupiedSeats: members.filter((member) => member.assignedSeat).length,
    availableSeats: 48 - members.filter((member) => member.assignedSeat).length,
    monthlyRevenue: payments.reduce((total, payment) => total + Number(payment.amount || 0), 0),
    expiringSoon,
    recentPayments: payments.slice(0, 10),
    revenueByMonth,
    statusBreakdown,
  };
}

module.exports = {
  buildReportStats,
};
