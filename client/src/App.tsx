import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import './App.css'

type Member = {
  id: number
  fullName: string
  mobileNumber: string
  joiningDate: string
  membershipPlan: string
  membershipStartDate: string
  membershipExpiryDate: string
  assignedSeat: string | null
  status: string
  monthlyDuration?: number
}

type Seat = {
  label: string
  status: string
  memberId: number | null
  memberName: string | null
  membershipExpiryDate: string | null
}

type Payment = {
  id: number
  memberId: number
  membershipPlan: string | null
  membershipStartDate: string | null
  membershipExpiryDate: string | null
  amount: number
  paymentDate: string
  paymentMethod: string
  receiptNumber: string
  notes: string | null
  createdAt: string | null
}

type Receipt = {
  id: number
  receiptNumber: string
  paymentDate: string
  memberId: number
  memberName: string | null
  mobileNumber: string | null
  assignedSeat: string | null
  membershipPlan: string | null
  membershipStartDate: string | null
  membershipExpiryDate: string | null
  amount: number
  paymentMethod: string
  notes: string | null
}

type DashboardStats = {
  activeMembers: number
  expiredMembers: number
  expiringSoon: number
  occupiedSeats: number
  availableSeats: number
  monthlyRevenue: number
}

type ReportStats = {
  totalMembers: number
  activeMembers: number
  expiredMembers: number
  pendingMembers: number
  occupiedSeats: number
  availableSeats: number
  monthlyRevenue: number
  expiringSoon: Array<{
    id: number
    fullName: string
    membershipExpiryDate: string
    assignedSeat: string | null
  }>
  recentPayments: Array<{
    id: number
    receiptNumber: string
    amount: number
    paymentDate: string
    paymentMethod: string
  }>
}

type MemberFormState = {
  fullName: string
  mobileNumber: string
  joiningDate: string
  membershipPlan: string
  membershipStartDate: string
  membershipExpiryDate: string
  assignedSeat: string
  status: string
  monthlyDuration: string
}

type RenewalFormState = {
  membershipPlan: string
  membershipStartDate: string
  notes: string
  monthlyDuration: string
}

type PaymentFormState = {
  memberId: string
  seatLabel: string
  amount: string
  paymentDate: string
  paymentMethod: string
  notes: string
}

type SeatAssignmentState = {
  memberId: number | null
  seatLabel: string
}

const apiBase = 'http://localhost:3001/api'

const emptyForm: MemberFormState = {
  fullName: '',
  mobileNumber: '',
  joiningDate: '',
  membershipPlan: 'Monthly',
  membershipStartDate: '',
  membershipExpiryDate: '',
  assignedSeat: '',
  status: 'Active',
  monthlyDuration: '1',
}

const emptyRenewalForm: RenewalFormState = {
  membershipPlan: 'Monthly',
  membershipStartDate: '',
  notes: '',
  monthlyDuration: '1',
}

const emptyPaymentForm: PaymentFormState = {
  memberId: '',
  seatLabel: '',
  amount: '',
  paymentDate: '',
  paymentMethod: 'Cash',
  notes: '',
}

const emptySeatAssignment: SeatAssignmentState = {
  memberId: null,
  seatLabel: '',
}

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '◉' },
  { id: 'members', label: 'Members', icon: '◎' },
  { id: 'seats', label: 'Seats', icon: '◌' },
  { id: 'payments', label: 'Payments', icon: '◍' },
  { id: 'reports', label: 'Reports', icon: '⬢' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
]

const seatLayoutRows = [
  { label: 'A', seats: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8'] },
  { label: 'B', seats: ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B11', 'B12', 'B13', 'B14', 'B15', 'B16'] },
  { label: 'C', seats: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'C13', 'C14'] },
  { label: 'D', seats: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10'] },
]

function formatCurrency(value: number) {
  return `₹${value.toLocaleString('en-IN')}`
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

function getStatusTone(status: string) {
  const normalized = status.toLowerCase()
  if (normalized.includes('active')) return 'success'
  if (normalized.includes('expir')) return 'warning'
  if (normalized.includes('pend')) return 'warning'
  if (normalized.includes('paid')) return 'success'
  return 'neutral'
}

function ReceiptPreview({ receipt, onClose }: { receipt: Receipt | null; onClose: () => void }) {
  if (!receipt) {
    return null
  }

  return (
    <div className="receipt-overlay" onClick={onClose}>
      <div className="receipt-card" onClick={(event) => event.stopPropagation()}>
        <div className="receipt-header">
          <div>
            <p className="eyebrow">Payment Receipt</p>
            <h3>Raj Digital Library</h3>
          </div>
          <div className="receipt-actions">
            <button type="button" className="btn btn-primary" onClick={() => window.print()}>
              Print
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <div className="receipt-body">
          <div className="receipt-row"><span>Receipt No.</span><strong>{receipt.receiptNumber}</strong></div>
          <div className="receipt-row"><span>Date</span><strong>{receipt.paymentDate}</strong></div>
          <div className="receipt-row"><span>Member</span><strong>{receipt.memberName ?? 'Unknown'}</strong></div>
          <div className="receipt-row"><span>Mobile</span><strong>{receipt.mobileNumber ?? '—'}</strong></div>
          <div className="receipt-row"><span>Seat</span><strong>{receipt.assignedSeat ?? '—'}</strong></div>
          <div className="receipt-row"><span>Membership</span><strong>{receipt.membershipPlan ?? '—'}</strong></div>
          <div className="receipt-row"><span>Valid From</span><strong>{receipt.membershipStartDate ?? '—'}</strong></div>
          <div className="receipt-row"><span>Valid Till</span><strong>{receipt.membershipExpiryDate ?? '—'}</strong></div>
          <div className="receipt-row"><span>Amount</span><strong>{formatCurrency(receipt.amount)}</strong></div>
          <div className="receipt-row"><span>Mode</span><strong>{receipt.paymentMethod}</strong></div>
          {receipt.notes ? <div className="receipt-row"><span>Notes</span><strong>{receipt.notes}</strong></div> : null}
        </div>
      </div>
    </div>
  )
}

function App() {
  const [members, setMembers] = useState<Member[]>([])
  const [seats, setSeats] = useState<Seat[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [dashboard, setDashboard] = useState<DashboardStats>({ activeMembers: 0, expiredMembers: 0, expiringSoon: 0, occupiedSeats: 0, availableSeats: 0, monthlyRevenue: 0 })
  const [reports, setReports] = useState<ReportStats>({ totalMembers: 0, activeMembers: 0, expiredMembers: 0, pendingMembers: 0, occupiedSeats: 0, availableSeats: 0, monthlyRevenue: 0, expiringSoon: [], recentPayments: [] })
  const [restoreMessage, setRestoreMessage] = useState('')
  const [form, setForm] = useState<MemberFormState>(emptyForm)
  const [renewalForm, setRenewalForm] = useState<RenewalFormState>(emptyRenewalForm)
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(emptyPaymentForm)
  const [seatAssignment, setSeatAssignment] = useState<SeatAssignmentState>(emptySeatAssignment)
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null)
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('dashboard')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedSeatLabel, setSelectedSeatLabel] = useState<string | null>(null)

  async function loadMembers() {
    const response = await fetch(`${apiBase}/members`)
    const data = await response.json()
    setMembers(data)
    setLoading(false)
  }

  async function loadSeats() {
    const response = await fetch(`${apiBase}/seats`)
    const data = await response.json()
    setSeats(data)
  }

  async function loadPayments() {
    const response = await fetch(`${apiBase}/payments`)
    const data = await response.json()
    setPayments(data)
  }

  async function loadDashboard() {
    const response = await fetch(`${apiBase}/dashboard`)
    const data = await response.json()
    setDashboard(data)
  }

  async function loadReports() {
    const response = await fetch(`${apiBase}/reports`)
    const data = await response.json()
    setReports(data)
  }

  async function refreshData() {
    await Promise.all([loadMembers(), loadSeats(), loadPayments(), loadDashboard(), loadReports()])
  }

  useEffect(() => {
    void refreshData()
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', isDarkMode)
  }, [isDarkMode])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const response = await fetch(`${apiBase}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, monthlyDuration: Number(form.monthlyDuration) }),
    })

    if (response.ok) {
      setForm(emptyForm)
      await refreshData()
    }
  }

  async function handleRenew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedMemberId) {
      return
    }

    const response = await fetch(`${apiBase}/members/${selectedMemberId}/renewals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...renewalForm, monthlyDuration: Number(renewalForm.monthlyDuration) }),
    })

    if (response.ok) {
      setRenewalForm(emptyRenewalForm)
      setSelectedMemberId(null)
      await refreshData()
    }
  }

  async function handlePaymentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const response = await fetch(`${apiBase}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...paymentForm,
        memberId: Number(paymentForm.memberId),
        amount: Number(paymentForm.amount),
        seatLabel: paymentForm.seatLabel || undefined,
      }),
    })

    if (response.ok) {
      setPaymentForm(emptyPaymentForm)
      await refreshData()
    }
  }

  async function openReceipt(paymentId: number) {
    const response = await fetch(`${apiBase}/payments/receipt/${paymentId}`)
    if (response.ok) {
      const receipt = await response.json()
      setSelectedReceipt(receipt)
    }
  }

  async function handleBackup() {
    window.open(`${apiBase}/backup`, '_blank')
  }

  async function handleRestore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const text = await file.text()
    const payload = JSON.parse(text)
    const response = await fetch(`${apiBase}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (response.ok) {
      setRestoreMessage('Restore completed successfully.')
      await refreshData()
    } else {
      const error = await response.json()
      setRestoreMessage(error.error || 'Restore failed.')
    }
  }

  async function handleSeatAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!seatAssignment.memberId || !seatAssignment.seatLabel) {
      return
    }

    const response = await fetch(`${apiBase}/seats/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: seatAssignment.memberId, seatLabel: seatAssignment.seatLabel }),
    })

    if (response.ok) {
      setSeatAssignment(emptySeatAssignment)
      await refreshData()
    }
  }

  async function handleSeatVacate(memberId: number) {
    const response = await fetch(`${apiBase}/seats/vacate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    })

    if (response.ok) {
      await refreshData()
    }
  }

  function handleSeatSelection(seat: Seat) {
    setSelectedSeatLabel(seat.label)
    setSeatAssignment((current) => ({ ...current, seatLabel: seat.label }))
  }

  const selectedMember = members.find((member) => member.id === selectedMemberId) ?? null
  const filteredMembers = members.filter((member) => {
    const query = memberSearch.trim().toLowerCase()
    if (!query) return true
    return [member.fullName, member.mobileNumber, member.membershipPlan, member.membershipExpiryDate].some((value) => value.toLowerCase().includes(query))
  })

  const todayLabel = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())
  const seatLookup = new Map(seats.map((seat) => [seat.label, seat]))
  const selectedSeat = selectedSeatLabel ? seatLookup.get(selectedSeatLabel) ?? null : null

  function scrollTo(sectionId: string) {
    setActiveSection(sectionId)
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="app-shell">
      <ReceiptPreview receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">RL</div>
          <div>
            <p className="brand-title">Raj Digital Library</p>
            <p className="brand-subtitle">Admin Console</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navigationItems.map((item) => (
            <button key={item.id} type="button" className={`nav-item ${activeSection === item.id ? 'active' : ''}`} onClick={() => scrollTo(item.id)}>
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-card">
          <p className="eyebrow">System health</p>
          <strong>All services online</strong>
          <p>Daily backup and receipts remain active.</p>
        </div>
      </aside>

      <div className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">{todayLabel}</p>
            <h2>Operations overview</h2>
          </div>
          <div className="topbar-actions">
            <label className="search-box">
              <span>⌕</span>
              <input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Search members" />
            </label>
            <button type="button" className="btn btn-icon" onClick={() => setIsDarkMode((value) => !value)}>{isDarkMode ? '☀' : '☾'}</button>
            <div className="profile-pill">AD</div>
          </div>
        </header>

        <main className="content">
          <section id="dashboard" className="section-card hero-card">
            <div className="hero-copy">
              <p className="eyebrow">Premium administration</p>
              <h1>Modern member, seat, and payment workflows in one place.</h1>
              <p>Everything stays fully functional while now feeling like a polished SaaS dashboard.</p>
            </div>
            <div className="hero-stats">
              <div className="stat-tile">
                <span>Active members</span>
                <strong>{dashboard.activeMembers}</strong>
              </div>
              <div className="stat-tile">
                <span>Expired</span>
                <strong>{dashboard.expiredMembers}</strong>
              </div>
              <div className="stat-tile">
                <span>Expiring soon</span>
                <strong>{dashboard.expiringSoon}</strong>
              </div>
              <div className="stat-tile">
                <span>Revenue</span>
                <strong>{formatCurrency(dashboard.monthlyRevenue)}</strong>
              </div>
            </div>
          </section>

          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div>
                <p>Active members</p>
                <strong>{dashboard.activeMembers}</strong>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏳</div>
              <div>
                <p>Expired</p>
                <strong>{dashboard.expiredMembers}</strong>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🕒</div>
              <div>
                <p>Expiring soon</p>
                <strong>{dashboard.expiringSoon}</strong>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div>
                <p>Monthly revenue</p>
                <strong>{formatCurrency(dashboard.monthlyRevenue)}</strong>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🪑</div>
              <div>
                <p>Occupied seats</p>
                <strong>{dashboard.occupiedSeats}</strong>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✓</div>
              <div>
                <p>Available seats</p>
                <strong>{dashboard.availableSeats}</strong>
              </div>
            </div>
          </section>

          <section id="members" className="section-card">
            <div className="section-header">
              <div>
                <p className="eyebrow">Members</p>
                <h3>Member management</h3>
              </div>
              <button type="button" className="btn btn-primary" onClick={() => scrollTo('dashboard')}>Back to overview</button>
            </div>
            <div className="two-column-grid">
              <div className="panel-card">
                <h4>Add member</h4>
                <form className="form-grid" onSubmit={handleSubmit}>
                  <label className="field">
                    <span>Full Name</span>
                    <input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required />
                  </label>
                  <label className="field">
                    <span>Mobile Number</span>
                    <input value={form.mobileNumber} onChange={(event) => setForm({ ...form, mobileNumber: event.target.value })} required />
                  </label>
                  <label className="field">
                    <span>Joining Date</span>
                    <input type="date" value={form.joiningDate} onChange={(event) => setForm({ ...form, joiningDate: event.target.value })} required />
                  </label>
                  <label className="field">
                    <span>Membership Type</span>
                    <div className="readonly-pill">Monthly</div>
                  </label>
                  <label className="field">
                    <span>Start Date</span>
                    <input type="date" value={form.membershipStartDate} onChange={(event) => setForm({ ...form, membershipStartDate: event.target.value })} required />
                  </label>
                  <label className="field">
                    <span>Monthly Duration</span>
                    <input type="number" min="1" max="12" value={form.monthlyDuration} onChange={(event) => setForm({ ...form, monthlyDuration: event.target.value })} disabled={form.membershipPlan !== 'Monthly'} />
                  </label>
                  <label className="field">
                    <span>Expiry Date</span>
                    <input type="date" value={form.membershipExpiryDate} onChange={(event) => setForm({ ...form, membershipExpiryDate: event.target.value })} />
                  </label>
                  <label className="field">
                    <span>Assigned Seat</span>
                    <input value={form.assignedSeat} onChange={(event) => setForm({ ...form, assignedSeat: event.target.value })} />
                  </label>
                  <label className="field">
                    <span>Status</span>
                    <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                      <option value="Active">Active</option>
                      <option value="Expired">Expired</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </label>
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">Save Member</button>
                  </div>
                </form>
              </div>

              <div className="panel-card">
                <h4>Renew membership</h4>
                <form className="form-grid" onSubmit={handleRenew}>
                  <label className="field">
                    <span>Member</span>
                    <select value={selectedMemberId ?? ''} onChange={(event) => setSelectedMemberId(Number(event.target.value) || null)}>
                      <option value="">Select a member</option>
                      {members.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>Membership Type</span>
                    <div className="readonly-pill">Monthly</div>
                  </label>
                  <label className="field">
                    <span>Monthly Duration</span>
                    <input type="number" min="1" max="12" value={renewalForm.monthlyDuration} onChange={(event) => setRenewalForm({ ...renewalForm, monthlyDuration: event.target.value })} disabled={renewalForm.membershipPlan !== 'Monthly'} />
                  </label>
                  <label className="field">
                    <span>Renewal Start</span>
                    <input type="date" value={renewalForm.membershipStartDate} onChange={(event) => setRenewalForm({ ...renewalForm, membershipStartDate: event.target.value })} />
                  </label>
                  <label className="field full-width">
                    <span>Notes</span>
                    <input value={renewalForm.notes} onChange={(event) => setRenewalForm({ ...renewalForm, notes: event.target.value })} />
                  </label>
                  <div className="form-actions full-width">
                    <button type="submit" className="btn btn-secondary">Renew Selected Member</button>
                  </div>
                </form>
                {selectedMember ? <p className="helper-text">Selected member: {selectedMember.fullName} • Current expiry {selectedMember.membershipExpiryDate}</p> : null}
              </div>
            </div>

            <div className="table-card">
              <div className="table-toolbar">
                <div>
                  <p className="eyebrow">Directory</p>
                  <h4>Member roster</h4>
                </div>
                <div className="table-actions">
                  <button type="button" className="btn btn-ghost">Export</button>
                </div>
              </div>
              {loading ? <p className="empty-state">Loading members…</p> : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Expiry</th>
                        <th>Seat</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((member) => (
                        <tr key={member.id}>
                          <td>#{member.id}</td>
                          <td>{member.fullName}</td>
                          <td>{member.membershipExpiryDate}</td>
                          <td>{member.assignedSeat ?? '—'}</td>
                          <td><span className={`badge badge-${getStatusTone(member.status)}`}>{member.status}</span></td>
                          <td>
                            <div className="inline-actions">
                              <button type="button" className="btn btn-ghost" onClick={() => { setSelectedMemberId(member.id); setRenewalForm({ ...renewalForm, membershipPlan: member.membershipPlan }) }}>Renew</button>
                              {member.assignedSeat ? <button type="button" className="btn btn-ghost" onClick={() => void handleSeatVacate(member.id)}>Vacate</button> : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section id="seats" className="section-card">
            <div className="section-header">
              <div>
                <p className="eyebrow">Seats</p>
                <h3>Seat management</h3>
              </div>
              <div className="section-note">Click any seat to inspect the occupant and vacancy date.</div>
            </div>
            <div className="two-column-grid">
              <div className="panel-card">
                <h4>Assign seat</h4>
                <form className="form-grid" onSubmit={handleSeatAssignment}>
                  <label className="field">
                    <span>Member</span>
                    <select value={seatAssignment.memberId ?? ''} onChange={(event) => setSeatAssignment({ ...seatAssignment, memberId: Number(event.target.value) || null })}>
                      <option value="">Select member</option>
                      {members.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>Seat</span>
                    <select value={seatAssignment.seatLabel} onChange={(event) => setSeatAssignment({ ...seatAssignment, seatLabel: event.target.value })}>
                      <option value="">Select seat</option>
                      {seats.map((seat) => <option key={seat.label} value={seat.label}>{seat.label} ({seat.status})</option>)}
                    </select>
                  </label>
                  <div className="form-actions full-width">
                    <button type="submit" className="btn btn-primary">Assign Seat</button>
                  </div>
                </form>
              </div>
              <div className="panel-card">
                <h4>Seat details</h4>
                {selectedSeat ? (
                  selectedSeat.memberName ? (
                    <div className="seat-detail-card">
                      <p className="eyebrow">{selectedSeat.label}</p>
                      <h4>{selectedSeat.memberName}</h4>
                      <p>Vacates on {formatDateLabel(selectedSeat.membershipExpiryDate)}</p>
                      <p>This seat becomes available after the member expiry date.</p>
                    </div>
                  ) : (
                    <div className="seat-detail-card">
                      <p className="eyebrow">{selectedSeat.label}</p>
                      <h4>Available</h4>
                      <p>Select a member above and assign this seat.</p>
                    </div>
                  )
                ) : (
                  <p className="helper-text">Choose a seat from the map to view the occupant and vacancy date.</p>
                )}
                <div className="legend-list">
                  <div className="legend-item"><span className="legend-dot available" /> Available</div>
                  <div className="legend-item"><span className="legend-dot occupied" /> Occupied</div>
                  <div className="legend-item"><span className="legend-dot expiring" /> Expiring</div>
                  <div className="legend-item"><span className="legend-dot disabled" /> Disabled</div>
                </div>
              </div>
            </div>
            <div className="seat-grid">
              {seatLayoutRows.map((row, rowIndex) => (
                <div key={`row-${rowIndex}`} className="seat-row">
                  <h4>Row {row.label}</h4>
                  <div className="seat-cells">
                    {row.seats.map((label) => {
                      const seat = seatLookup.get(label)
                      const seatStatus = seat?.status ?? 'available'
                      return (
                        <button
                          key={label}
                          type="button"
                          className={`seat-cell ${seatStatus}`}
                          onClick={() => handleSeatSelection(seat ?? { label, status: 'available', memberId: null, memberName: null, membershipExpiryDate: null })}
                        >
                          <strong>{label}</strong>
                          <span>{seat?.memberName ?? 'Available'}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="payments" className="section-card">
            <div className="section-header">
              <div>
                <p className="eyebrow">Payments</p>
                <h3>Collection and receipts</h3>
              </div>
            </div>
            <div className="two-column-grid">
              <div className="panel-card">
                <h4>Record payment</h4>
                <form className="form-grid" onSubmit={handlePaymentSubmit}>
                  <label className="field">
                    <span>Member</span>
                    <select value={paymentForm.memberId} onChange={(event) => setPaymentForm({ ...paymentForm, memberId: event.target.value })} required>
                      <option value="">Select member</option>
                      {members.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>Assigned Seat</span>
                    <select value={paymentForm.seatLabel} onChange={(event) => setPaymentForm({ ...paymentForm, seatLabel: event.target.value })}>
                      <option value="">No seat selected</option>
                      {seats.map((seat) => <option key={seat.label} value={seat.label}>{seat.label} ({seat.status})</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>Amount</span>
                    <input type="number" min="0" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} required />
                  </label>
                  <label className="field">
                    <span>Payment Date</span>
                    <input type="date" value={paymentForm.paymentDate} onChange={(event) => setPaymentForm({ ...paymentForm, paymentDate: event.target.value })} required />
                  </label>
                  <label className="field">
                    <span>Payment Method</span>
                    <select value={paymentForm.paymentMethod} onChange={(event) => setPaymentForm({ ...paymentForm, paymentMethod: event.target.value })}>
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </label>
                  <label className="field full-width">
                    <span>Notes</span>
                    <input value={paymentForm.notes} onChange={(event) => setPaymentForm({ ...paymentForm, notes: event.target.value })} />
                  </label>
                  <div className="form-actions full-width">
                    <button type="submit" className="btn btn-primary">Save Payment</button>
                  </div>
                </form>
              </div>
              <div className="panel-card">
                <h4>Payment summary</h4>
                <div className="summary-stack">
                  <div className="summary-item"><span>Monthly revenue</span><strong>{formatCurrency(dashboard.monthlyRevenue)}</strong></div>
                  <div className="summary-item"><span>Latest receipt</span><strong>{payments[0]?.receiptNumber ?? '—'}</strong></div>
                  <div className="summary-item"><span>Records</span><strong>{payments.length}</strong></div>
                </div>
              </div>
            </div>
            <div className="table-card">
              <div className="table-toolbar">
                <div>
                  <p className="eyebrow">Ledger</p>
                  <h4>Recent payments</h4>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Receipt</th>
                      <th>Member</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Method</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => {
                      const member = members.find((item) => item.id === payment.memberId)
                      return (
                        <tr key={payment.id}>
                          <td>{payment.receiptNumber}</td>
                          <td>{member?.fullName ?? 'Unknown'}</td>
                          <td>{formatCurrency(payment.amount)}</td>
                          <td>{payment.paymentDate}</td>
                          <td>{payment.paymentMethod}</td>
                          <td><button type="button" className="btn btn-ghost" onClick={() => void openReceipt(payment.id)}>View receipt</button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section id="reports" className="section-card">
            <div className="section-header">
              <div>
                <p className="eyebrow">Reports</p>
                <h3>Operational reports</h3>
              </div>
            </div>
            <div className="stats-grid">
              <div className="stat-card"><div className="stat-icon">👥</div><div><p>Total members</p><strong>{reports.totalMembers}</strong></div></div>
              <div className="stat-card"><div className="stat-icon">✓</div><div><p>Active members</p><strong>{reports.activeMembers}</strong></div></div>
              <div className="stat-card"><div className="stat-icon">⚠</div><div><p>Expired</p><strong>{reports.expiredMembers}</strong></div></div>
              <div className="stat-card"><div className="stat-icon">🕒</div><div><p>Pending</p><strong>{reports.pendingMembers}</strong></div></div>
              <div className="stat-card"><div className="stat-icon">💰</div><div><p>Revenue</p><strong>{formatCurrency(reports.monthlyRevenue)}</strong></div></div>
              <div className="stat-card"><div className="stat-icon">🪑</div><div><p>Availability</p><strong>{reports.availableSeats}/{reports.occupiedSeats + reports.availableSeats}</strong></div></div>
            </div>
            <div className="two-column-grid" style={{ marginTop: '18px' }}>
              <div className="panel-card">
                <h4>Expiring soon</h4>
                <ul className="list-stack">
                  {reports.expiringSoon.map((member) => <li key={member.id}>{member.fullName} — {member.membershipExpiryDate} {member.assignedSeat ? `• Seat ${member.assignedSeat}` : ''}</li>)}
                </ul>
              </div>
              <div className="panel-card">
                <h4>Recent payments</h4>
                <ul className="list-stack">
                  {reports.recentPayments.map((payment) => <li key={payment.id}>{payment.receiptNumber} — {formatCurrency(payment.amount)} on {payment.paymentDate} ({payment.paymentMethod})</li>)}
                </ul>
              </div>
            </div>
          </section>

          <section id="settings" className="section-card">
            <div className="section-header">
              <div>
                <p className="eyebrow">Settings</p>
                <h3>Backup & restore</h3>
              </div>
            </div>
            <div className="two-column-grid">
              <div className="panel-card">
                <h4>Download backup</h4>
                <p>Create a JSON export for members, renewals, and payments.</p>
                <button type="button" className="btn btn-primary" onClick={() => void handleBackup()}>Download Backup</button>
              </div>
              <div className="panel-card">
                <h4>Restore backup</h4>
                <p>Import a previously exported backup file to restore the database.</p>
                <input type="file" accept="application/json" onChange={(event) => void handleRestore(event)} />
                {restoreMessage ? <p className="helper-text">{restoreMessage}</p> : null}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default App
