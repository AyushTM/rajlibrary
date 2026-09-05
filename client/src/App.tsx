import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import './App.css'

type Member = {
  id: number
  fullName: string
  mobileNumber: string
  email?: string
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
  revenueByMonth: Array<{
    label: string
    revenue: number
    members: number
  }>
  statusBreakdown: Array<{
    label: string
    count: number
  }>
}

type MemberFormState = {
  fullName: string
  mobileNumber: string
  email: string
  joiningDate: string
  assignedSeat: string
}

type FeedbackState = {
  type: 'success' | 'error'
  text: string
}

type AuthState = {
  token: string | null
  username: string | null
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
  membershipPlan: string
  membershipStartDate: string
  membershipExpiryDate: string
  amount: string
  paymentDate: string
  paymentMethod: string
  notes: string
}

type SeatAssignmentState = {
  memberId: number | null
  seatLabel: string
}

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
const membershipPlanOptions = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly']

const emptyForm: MemberFormState = {
  fullName: '',
  mobileNumber: '',
  email: '',
  joiningDate: '',
  assignedSeat: '',
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
  membershipPlan: 'Monthly',
  membershipStartDate: '',
  membershipExpiryDate: '',
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
  return 'neutral'
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

function downloadInvoice(receipt: Receipt) {
  const html = `
    <html>
      <head>
        <title>Invoice ${receipt.receiptNumber}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            background: #f8fafc;
            color: #0f172a;
            padding: 32px;
          }
          .invoice {
            max-width: 780px;
            margin: 0 auto;
            background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
            border: 1px solid #e2e8f0;
            border-radius: 22px;
            overflow: hidden;
            box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
          }
          .header {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #f8fafc;
            padding: 28px 30px 20px;
          }
          .brand {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
          }
          .brand-mark {
            width: 54px;
            height: 54px;
            border-radius: 15px;
            background: rgba(255,255,255,0.12);
            display: grid;
            place-items: center;
            font-weight: 700;
            letter-spacing: 1px;
          }
          .title {
            margin: 0;
            font-size: 30px;
            font-weight: 700;
            letter-spacing: 0.04em;
          }
          .subtitle {
            margin: 8px 0 0;
            opacity: 0.8;
            font-size: 13px;
          }
          .status {
            padding: 8px 14px;
            border-radius: 999px;
            background: rgba(52, 211, 153, 0.18);
            border: 1px solid rgba(52, 211, 153, 0.35);
            color: #d1fae5;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .body {
            padding: 24px 30px 10px;
          }
          .meta-row {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
            margin-bottom: 24px;
          }
          .meta-box {
            border: 1px solid #e2e8f0;
            background: #f8fafc;
            border-radius: 16px;
            padding: 16px 18px;
          }
          .meta-label {
            display: block;
            font-size: 11px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 6px;
          }
          .meta-value {
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
          }
          .summary {
            background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%);
            border: 1px solid #dbeafe;
            border-radius: 18px;
            padding: 18px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 22px;
          }
          .summary strong {
            display: block;
            font-size: 28px;
            margin-top: 4px;
          }
          .summary small {
            color: #475569;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .summary .chip {
            padding: 8px 12px;
            border-radius: 999px;
            background: #e0f2fe;
            color: #0f172a;
            font-weight: 700;
            font-size: 12px;
          }
          .details {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px;
          }
          .section {
            border: 1px solid #e2e8f0;
            border-radius: 18px;
            background: #fff;
            padding: 18px;
          }
          .section h4 {
            margin: 0 0 14px;
            font-size: 14px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #475569;
          }
          .row {
            display: flex;
            justify-content: space-between;
            gap: 14px;
            padding: 8px 0;
            border-bottom: 1px dashed #e2e8f0;
          }
          .row:last-child { border-bottom: none; }
          .row span { color: #64748b; }
          .row strong { text-align: right; }
          .footer {
            padding: 24px 30px 30px;
            color: #475569;
            display: flex;
            justify-content: space-between;
            align-items: end;
            gap: 20px;
          }
          .thankyou {
            font-size: 15px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 4px;
          }
          .signature {
            text-align: right;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #64748b;
          }
          @media (max-width: 640px) {
            body { padding: 16px; }
            .meta-row, .details { grid-template-columns: 1fr; }
            .brand, .summary, .footer { flex-direction: column; align-items: flex-start; }
            .summary { align-items: flex-start; }
          }
        </style>
      </head>
      <body>
        <div class="invoice">
          <div class="header">
            <div class="brand">
              <div style="display: flex; align-items: center; gap: 14px;">
                <div class="brand-mark">RDL</div>
                <div>
                  <h2 class="title">RAJ DIGITAL LIBRARY</h2>
                  <p class="subtitle">Study Center & Reading Room</p>
                </div>
              </div>
              <div class="status">Paid</div>
            </div>
          </div>

          <div class="body">
            <div class="meta-row">
              <div class="meta-box">
                <span class="meta-label">Receipt No.</span>
                <div class="meta-value">${receipt.receiptNumber}</div>
              </div>
              <div class="meta-box">
                <span class="meta-label">Issued on</span>
                <div class="meta-value">${receipt.paymentDate}</div>
              </div>
            </div>

            <div class="summary">
              <div>
                <small>Total Paid</small>
                <strong>₹${receipt.amount.toLocaleString('en-IN')}</strong>
              </div>
              <div class="chip">${receipt.membershipPlan ?? 'Membership'}</div>
            </div>

            <div class="details">
              <div class="section">
                <h4>Member details</h4>
                <div class="row"><span>Member ID</span><strong>M-${receipt.memberId.toString().padStart(4, '0')}</strong></div>
                <div class="row"><span>Name</span><strong>${receipt.memberName ?? 'Unknown'}</strong></div>
                <div class="row"><span>Mobile</span><strong>${receipt.mobileNumber ?? '—'}</strong></div>
                <div class="row"><span>Seat</span><strong>${receipt.assignedSeat ?? '—'}</strong></div>
              </div>

              <div class="section">
                <h4>Membership details</h4>
                <div class="row"><span>Plan</span><strong>${receipt.membershipPlan ?? '—'}</strong></div>
                <div class="row"><span>Start date</span><strong>${receipt.membershipStartDate ?? '—'}</strong></div>
                <div class="row"><span>Expiry date</span><strong>${receipt.membershipExpiryDate ?? '—'}</strong></div>
                <div class="row"><span>Payment mode</span><strong>${receipt.paymentMethod}</strong></div>
              </div>
            </div>
          </div>

          <div class="footer">
            <div>
              <div class="thankyou">Thank you for your payment.</div>
              <div>${receipt.notes ? `Note: ${receipt.notes}` : 'Raj Digital Library'}</div>
            </div>
            <div class="signature">Authorized Receipt<br />Raj Digital Library</div>
          </div>
        </div>
      </body>
    </html>
  `

  const printWindow = window.open('', '_blank', 'width=800,height=900')
  if (!printWindow) {
    return
  }

  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

function ReceiptPreview({ receipt, onClose }: { receipt: Receipt | null; onClose: () => void }) {
  if (!receipt) {
    return null
  }

  return (
    <div className="receipt-overlay" onClick={onClose}>
      <div className="receipt-card" onClick={(event) => event.stopPropagation()}>
        <div className="receipt-header">
          <div className="receipt-brand">
            <div className="receipt-brand-mark">RDL</div>
            <div>
              <p className="eyebrow">Official receipt</p>
              <h3>Raj Digital Library</h3>
            </div>
          </div>
          <div className="receipt-actions">
            <button type="button" className="btn btn-primary" onClick={() => receipt && downloadInvoice(receipt)}>
              Export invoice
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
              Print
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="receipt-topline">
          <span className="receipt-badge">Paid</span>
          <div className="receipt-number-block">
            <span>Receipt No.</span>
            <strong>{receipt.receiptNumber}</strong>
          </div>
          <div className="receipt-date-block">
            <span>Issued on</span>
            <strong>{receipt.paymentDate}</strong>
          </div>
        </div>

        <div className="receipt-summary">
          <div>
            <small>Total paid</small>
            <strong>{formatCurrency(receipt.amount)}</strong>
          </div>
          <div className="receipt-chip">{receipt.membershipPlan ?? 'Membership'}</div>
        </div>

        <div className="receipt-grid">
          <div className="receipt-section">
            <h4>Member details</h4>
            <div className="receipt-row"><span>Member ID</span><strong>M-{receipt.memberId.toString().padStart(4, '0')}</strong></div>
            <div className="receipt-row"><span>Name</span><strong>{receipt.memberName ?? 'Unknown'}</strong></div>
            <div className="receipt-row"><span>Mobile</span><strong>{receipt.mobileNumber ?? '—'}</strong></div>
            <div className="receipt-row"><span>Seat</span><strong>{receipt.assignedSeat ?? '—'}</strong></div>
          </div>

          <div className="receipt-section">
            <h4>Membership details</h4>
            <div className="receipt-row"><span>Plan</span><strong>{receipt.membershipPlan ?? '—'}</strong></div>
            <div className="receipt-row"><span>Start date</span><strong>{receipt.membershipStartDate ?? '—'}</strong></div>
            <div className="receipt-row"><span>Expiry date</span><strong>{receipt.membershipExpiryDate ?? '—'}</strong></div>
            <div className="receipt-row"><span>Payment mode</span><strong>{receipt.paymentMethod}</strong></div>
          </div>
        </div>

        {receipt.notes ? (
          <div className="receipt-notes">
            <span>Notes</span>
            <strong>{receipt.notes}</strong>
          </div>
        ) : null}

        <div className="receipt-footer">
          <div>
            <div className="receipt-thankyou">Thank you for your payment.</div>
            <small>Raj Digital Library • Study Center & Reading Room</small>
          </div>
          <div className="receipt-signature">Authorized receipt</div>
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
  const [reports, setReports] = useState<ReportStats>({ totalMembers: 0, activeMembers: 0, expiredMembers: 0, pendingMembers: 0, occupiedSeats: 0, availableSeats: 0, monthlyRevenue: 0, expiringSoon: [], recentPayments: [], revenueByMonth: [], statusBreakdown: [] })
  const [restoreMessage, setRestoreMessage] = useState('')
  const [form, setForm] = useState<MemberFormState>(emptyForm)
  const [editForm, setEditForm] = useState<MemberFormState>(emptyForm)
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
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [auth, setAuth] = useState<AuthState>({ token: typeof window !== 'undefined' ? localStorage.getItem('rdl-token') : null, username: typeof window !== 'undefined' ? localStorage.getItem('rdl-username') : null })
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: 'admin123' })
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null)
  const [memberMenuOpenId, setMemberMenuOpenId] = useState<number | null>(null)
  const [selectedDashboardView, setSelectedDashboardView] = useState<'overview' | 'expired' | 'expiring' | 'active' | 'revenue'>('overview')

  function getAuthHeaders(): Record<string, string> {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('rdl-token') : null
    const tokenValue = auth.token ?? stored
    const headers: Record<string, string> = {}
    if (tokenValue) {
      headers.Authorization = `Bearer ${tokenValue}`
    }
    return headers
  }

  function handleUnauthorized() {
    localStorage.removeItem('rdl-token')
    localStorage.removeItem('rdl-username')
    setAuth({ token: null, username: null })
    setLoading(false)
    setFeedback({ type: 'error', text: 'Session expired. Please sign in again.' })
  }

  function setRoute(section: string) {
    setActiveSection(section)
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `#/${section}`)
    }
  }

  useEffect(() => {
    const syncRoute = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '')
      const nextSection = navigationItems.some((entry) => entry.id === hash) ? hash : 'dashboard'
      setActiveSection(nextSection)
    }

    syncRoute()
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [])

  async function loadMembers() {
    if (!auth.token) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${apiBase}/members`, { headers: getAuthHeaders() })
      if (!response.ok) {
        console.warn('Unable to load members:', response.status)
        setMembers([])
        return
      }

      const data = await response.json()
      setMembers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(error)
      setFeedback({ type: 'error', text: 'Unable to load members right now.' })
    } finally {
      setLoading(false)
    }
  }

  async function loadSeats() {
    try {
      const response = await fetch(`${apiBase}/seats`, { headers: getAuthHeaders() })
      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorized()
          return
        }

        console.warn('Unable to load seats:', response.status)
        setSeats([])
        return
      }

      const data = await response.json().catch(() => [])
      setSeats(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(error)
      setSeats([])
    }
  }

  async function loadPayments() {
    try {
      const response = await fetch(`${apiBase}/payments`, { headers: getAuthHeaders() })
      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorized()
          return
        }

        console.warn('Unable to load payments:', response.status)
        setPayments([])
        return
      }

      const data = await response.json().catch(() => [])
      setPayments(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(error)
    }
  }

  async function loadDashboard() {
    try {
      const response = await fetch(`${apiBase}/dashboard`, { headers: getAuthHeaders() })
      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorized()
          return
        }

        console.warn('Unable to load dashboard:', response.status)
        return
      }

      const data = await response.json().catch(() => null)
      if (data && typeof data === 'object') setDashboard(data)
    } catch (error) {
      console.error(error)
    }
  }

  async function loadReports() {
    try {
      const response = await fetch(`${apiBase}/reports`, { headers: getAuthHeaders() })
      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorized()
          return
        }

        console.warn('Unable to load reports:', response.status)
        setReports({ totalMembers: 0, activeMembers: 0, expiredMembers: 0, pendingMembers: 0, occupiedSeats: 0, availableSeats: 0, monthlyRevenue: 0, expiringSoon: [], recentPayments: [], revenueByMonth: [], statusBreakdown: [] })
        return
      }

      const data = await response.json().catch(() => null)
      setReports(typeof data === 'object' && data !== null ? data : { totalMembers: 0, activeMembers: 0, expiredMembers: 0, pendingMembers: 0, occupiedSeats: 0, availableSeats: 0, monthlyRevenue: 0, expiringSoon: [], recentPayments: [], revenueByMonth: [], statusBreakdown: [] })
    } catch (error) {
      console.error(error)
    }
  }

  async function refreshData() {
    await Promise.all([loadMembers(), loadSeats(), loadPayments(), loadDashboard(), loadReports()])
  }

  useEffect(() => {
    if (!auth.token) {
      setLoading(false)
      return
    }

    void refreshData()
  }, [auth.token])

  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', isDarkMode)
  }, [isDarkMode])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const response = await fetch(`${apiBase}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({
        ...form,
        membershipPlan: 'Monthly',
        membershipStartDate: new Date().toISOString().slice(0, 10),
        membershipExpiryDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 10),
        status: 'Active',
        monthlyDuration: 1,
      }),
    })

    if (response.ok) {
      setForm(emptyForm)
      setFeedback({ type: 'success', text: 'Member created successfully.' })
      await refreshData()
    } else {
      const error = await response.json().catch(() => ({ error: 'Unable to create member.' }))
      setFeedback({ type: 'error', text: error.error || 'Unable to create member.' })
    }
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingMemberId) {
      return
    }

    const existingMember = members.find((member) => member.id === editingMemberId)
    if (!existingMember) {
      setFeedback({ type: 'error', text: 'Member details are no longer available for update.' })
      return
    }

    const response = await fetch(`${apiBase}/members/${editingMemberId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({
        ...editForm,
        membershipPlan: existingMember.membershipPlan,
        membershipStartDate: existingMember.membershipStartDate,
        membershipExpiryDate: existingMember.membershipExpiryDate,
        status: existingMember.status,
        monthlyDuration: existingMember.monthlyDuration ?? 1,
      }),
    })

    if (response.ok) {
      setEditingMemberId(null)
      setEditForm(emptyForm)
      setFeedback({ type: 'success', text: 'Member updated successfully.' })
      await refreshData()
    } else {
      const error = await response.json().catch(() => ({ error: 'Unable to update member.' }))
      setFeedback({ type: 'error', text: error.error || 'Unable to update member.' })
    }
  }

  async function handleDeleteMember(memberId: number) {
    if (!window.confirm('Delete this member?')) {
      return
    }

    const response = await fetch(`${apiBase}/members/${memberId}`, { method: 'DELETE', headers: getAuthHeaders() })
    if (response.ok) {
      setFeedback({ type: 'success', text: 'Member deleted.' })
      await refreshData()
    } else {
      const error = await response.json().catch(() => ({ error: 'Unable to delete member.' }))
      setFeedback({ type: 'error', text: error.error || 'Unable to delete member.' })
    }
  }

  async function handleRenew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedMemberId) {
      return
    }

    const response = await fetch(`${apiBase}/members/${selectedMemberId}/renewals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ ...renewalForm, monthlyDuration: Number(renewalForm.monthlyDuration) }),
    })

    if (response.ok) {
      setRenewalForm(emptyRenewalForm)
      setSelectedMemberId(null)
      setFeedback({ type: 'success', text: 'Membership renewed successfully.' })
      await refreshData()
    } else {
      const error = await response.json().catch(() => ({ error: 'Unable to renew membership.' }))
      setFeedback({ type: 'error', text: error.error || 'Unable to renew membership.' })
    }
  }

  async function handlePaymentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const response = await fetch(`${apiBase}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({
        ...paymentForm,
        memberId: Number(paymentForm.memberId),
        amount: Number(paymentForm.amount),
        seatLabel: paymentForm.seatLabel || undefined,
        membershipPlan: paymentForm.membershipPlan,
        membershipStartDate: paymentForm.membershipStartDate,
        membershipExpiryDate: paymentForm.membershipExpiryDate,
      }),
    })

    if (response.ok) {
      setPaymentForm(emptyPaymentForm)
      setFeedback({ type: 'success', text: 'Payment recorded successfully.' })
      await refreshData()
    } else {
      const error = await response.json().catch(() => ({ error: 'Unable to record payment.' }))
      setFeedback({ type: 'error', text: error.error || 'Unable to record payment.' })
    }
  }

  async function openReceipt(paymentId: number) {
    const response = await fetch(`${apiBase}/payments/receipt/${paymentId}`, { headers: getAuthHeaders() })
    if (response.ok) {
      const receipt = await response.json()
      setSelectedReceipt(receipt)
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsAuthenticating(true)
    const response = await fetch(`${apiBase}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm),
    })

    if (response.ok) {
      const result = await response.json()
      localStorage.setItem('rdl-token', result.token)
      localStorage.setItem('rdl-username', result.user.username)
      setAuth({ token: result.token, username: result.user.username })
      setFeedback({ type: 'success', text: `Signed in as ${result.user.username}.` })
      await refreshData()
    } else {
      const error = await response.json().catch(() => ({ error: 'Login failed.' }))
      setFeedback({ type: 'error', text: error.error || 'Login failed.' })
    }

    setIsAuthenticating(false)
  }

  function handleLogout() {
    localStorage.removeItem('rdl-token')
    localStorage.removeItem('rdl-username')
    setAuth({ token: null, username: null })
    setFeedback({ type: 'success', text: 'Signed out.' })
  }

  async function handleBackup() {
    if (!auth.token) {
      setFeedback({ type: 'error', text: 'Please sign in before downloading backups.' })
      return
    }

    const response = await fetch(`${apiBase}/backup`, { headers: getAuthHeaders() })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Backup download failed.' }))
      setFeedback({ type: 'error', text: error.error || 'Backup download failed.' })
      return
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'raj-digital-library-backup.json'
    link.click()
    URL.revokeObjectURL(url)
    setFeedback({ type: 'success', text: 'Backup downloaded successfully.' })
  }

  function handleExportMembers() {
    const rows = filteredMembers.map((member) => [member.id, member.fullName, member.mobileNumber, member.membershipStartDate, member.membershipExpiryDate, member.assignedSeat ?? '', member.status].join(','))
    const csv = ['id,name,mobile,startDate,expiry,seat,status', ...rows].join('\n')
    downloadTextFile('members.csv', csv, 'text/csv;charset=utf-8;')
    setFeedback({ type: 'success', text: 'Member export downloaded.' })
  }

  function handleExportReports() {
    const rows = [
      ['metric', 'value'],
      ['totalMembers', String(reports.totalMembers)],
      ['activeMembers', String(reports.activeMembers)],
      ['expiredMembers', String(reports.expiredMembers)],
      ['pendingMembers', String(reports.pendingMembers)],
      ['monthlyRevenue', String(reports.monthlyRevenue)],
      ['availableSeats', String(reports.availableSeats)],
      [''],
      ['month', 'revenue', 'contributors'],
      ...reports.revenueByMonth.map((entry) => [entry.label, String(entry.revenue), String(entry.members)]),
    ]
    const csv = rows.map((row) => row.join(',')).join('\n')
    downloadTextFile('reports.csv', csv, 'text/csv;charset=utf-8;')
    setFeedback({ type: 'success', text: 'Report export downloaded.' })
  }

  function handleExportRevenueBreakdown() {
    const rows = [
      ['month', 'revenue', 'contributors'],
      ...reports.revenueByMonth.map((entry) => [entry.label, String(entry.revenue), String(entry.members)]),
    ]
    const csv = rows.map((row) => row.join(',')).join('\n')
    downloadTextFile('revenue-breakdown.csv', csv, 'text/csv;charset=utf-8;')
    setFeedback({ type: 'success', text: 'Revenue breakdown export downloaded.' })
  }

  function handleExportAllData() {
    const payload = { exportedAt: new Date().toISOString(), members, payments, reports }
    downloadTextFile('raj-digital-library-export.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8;')
    setFeedback({ type: 'success', text: 'Data export downloaded.' })
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
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    })

    if (response.ok) {
      setRestoreMessage('Restore completed successfully.')
      setFeedback({ type: 'success', text: 'Backup restored successfully.' })
      await refreshData()
    } else {
      const error = await response.json().catch(() => ({ error: 'Restore failed.' }))
      setRestoreMessage(error.error || 'Restore failed.')
      setFeedback({ type: 'error', text: error.error || 'Restore failed.' })
    }
  }

  async function handleSeatAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!seatAssignment.memberId || !seatAssignment.seatLabel) {
      return
    }

    const response = await fetch(`${apiBase}/seats/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ memberId: seatAssignment.memberId, seatLabel: seatAssignment.seatLabel }),
    })

    if (response.ok) {
      setSeatAssignment(emptySeatAssignment)
      setFeedback({ type: 'success', text: 'Seat assigned successfully.' })
      await refreshData()
    } else {
      const error = await response.json().catch(() => ({ error: 'Unable to assign seat.' }))
      setFeedback({ type: 'error', text: error.error || 'Unable to assign seat.' })
    }
  }

  function handleSeatSelection(seat: Seat) {
    setSelectedSeatLabel(seat.label)
    setSeatAssignment((current) => ({ ...current, seatLabel: seat.label }))
  }

  function startEditingMember(member: Member) {
    setEditingMemberId(member.id)
    setEditForm({
      fullName: member.fullName,
      mobileNumber: member.mobileNumber,
      email: member.email ?? '',
      joiningDate: member.joiningDate,
      assignedSeat: member.assignedSeat ?? '',
    })
    setMemberMenuOpenId(null)
  }

  const selectedMember = members.find((member) => member.id === selectedMemberId) ?? null
  const filteredMembers = members.filter((member) => {
    const query = memberSearch.trim().toLowerCase()
    if (!query) return true
    return [member.fullName, member.mobileNumber, member.membershipPlan, member.membershipExpiryDate].some((value) => value.toLowerCase().includes(query))
  })

  const todayLabel = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())
  const seatLookup = new Map((Array.isArray(seats) ? seats : []).map((seat) => [seat.label, seat]))
  const selectedSeat = selectedSeatLabel ? seatLookup.get(selectedSeatLabel) ?? null : null
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, today.getDate())
  const fourDaysAhead = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4)

  function parseMembershipDate(value: string | null | undefined) {
    if (!value) {
      return null
    }

    const parsed = new Date(`${value}T00:00:00`)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const expiredMembersList = members.filter((member) => {
    const expiry = parseMembershipDate(member.membershipExpiryDate)
    return expiry ? expiry <= startOfToday && expiry >= twoMonthsAgo : false
  })

  const expiringSoonMembersList = members.filter((member) => {
    const expiry = parseMembershipDate(member.membershipExpiryDate)
    return expiry ? expiry >= startOfToday && expiry <= fourDaysAhead : false
  })

  const activeMembersList = members.filter((member) => member.status.toLowerCase().includes('active'))

  const monthlyRevenuePaymentsList = payments.filter((payment) => {
    const paymentDate = parseMembershipDate(payment.paymentDate)
    return paymentDate ? paymentDate.getFullYear() === today.getFullYear() && paymentDate.getMonth() === today.getMonth() : false
  })

  const renderDashboard = () => (
    <div className="content-stack">
      <section className="stats-grid">
        <button type="button" className="stat-card stat-card-button" onClick={() => setSelectedDashboardView('active')}>
          <div className="stat-icon">👥</div>
          <div><p>Active members</p><strong>{dashboard.activeMembers}</strong></div>
        </button>
        <button type="button" className="stat-card stat-card-button" onClick={() => setSelectedDashboardView('expired')}>
          <div className="stat-icon">⏳</div>
          <div><p>Expired</p><strong>{dashboard.expiredMembers}</strong></div>
        </button>
        <button type="button" className="stat-card stat-card-button" onClick={() => setSelectedDashboardView('expiring')}>
          <div className="stat-icon">🕒</div>
          <div><p>Expiring soon</p><strong>{dashboard.expiringSoon}</strong></div>
        </button>
        <button type="button" className="stat-card stat-card-button" onClick={() => setSelectedDashboardView('revenue')}>
          <div className="stat-icon">💰</div>
          <div><p>Monthly revenue</p><strong>{formatCurrency(dashboard.monthlyRevenue)}</strong></div>
        </button>
        <div className="stat-card"><div className="stat-icon">🪑</div><div><p>Occupied seats</p><strong>{dashboard.occupiedSeats}</strong></div></div>
        <div className="stat-card"><div className="stat-icon">✓</div><div><p>Available seats</p><strong>{dashboard.availableSeats}</strong></div></div>
      </section>

      <section className="panel-card dashboard-detail-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Quick view</p>
            <h3>{selectedDashboardView === 'expired' ? 'Recently expired memberships' : selectedDashboardView === 'expiring' ? 'Members expiring soon' : selectedDashboardView === 'active' ? 'Active members' : selectedDashboardView === 'revenue' ? 'This month’s payment activity' : 'Select a card to inspect records'}</h3>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => setSelectedDashboardView('overview')}>Reset</button>
        </div>

        {selectedDashboardView === 'overview' ? (
          <p className="helper-text">Click any dashboard card to view the matching members or payments.</p>
        ) : selectedDashboardView === 'revenue' ? (
          <div className="detail-list">
            {monthlyRevenuePaymentsList.length ? monthlyRevenuePaymentsList.map((payment) => {
              const member = members.find((item) => item.id === payment.memberId)
              return (
                <div key={payment.id} className="detail-row">
                  <div>
                    <strong>{member?.fullName ?? 'Unknown member'}</strong>
                    <p className="detail-meta">Receipt {payment.receiptNumber} • {formatCurrency(payment.amount)} • {payment.paymentDate}</p>
                  </div>
                  <button type="button" className="btn btn-ghost" onClick={() => void openReceipt(payment.id)}>View receipt</button>
                </div>
              )
            }) : <p className="helper-text">No payments recorded this month yet.</p>}
          </div>
        ) : (
          <div className="detail-list">
            {(selectedDashboardView === 'expired' ? expiredMembersList : selectedDashboardView === 'expiring' ? expiringSoonMembersList : activeMembersList).length ? (selectedDashboardView === 'expired' ? expiredMembersList : selectedDashboardView === 'expiring' ? expiringSoonMembersList : activeMembersList).map((member) => (
              <div key={member.id} className="detail-row">
                <div>
                  <strong>{member.fullName}</strong>
                  <p className="detail-meta">Start {member.membershipStartDate || '—'} • Expires {member.membershipExpiryDate || '—'} • Seat {member.assignedSeat ?? '—'}</p>
                </div>
                <span className={`badge badge-${getStatusTone(member.status)}`}>{member.status}</span>
              </div>
            )) : <p className="helper-text">No matching members to show right now.</p>}
          </div>
        )}
      </section>
    </div>
  )

  const renderMembers = () => (
    <div className="content-stack">
      <section className="section-card">
        <div className="section-header">
          <div><p className="eyebrow">Members</p><h3>Member management</h3></div>
          <button type="button" className="btn btn-primary" onClick={() => setRoute('dashboard')}>Back to dashboard</button>
        </div>

        <div className="two-column-grid">
          <div className="panel-card">
            <h4>Add member</h4>
            <form className="form-grid" onSubmit={handleSubmit}>
              <label className="field"><span>Full Name</span><input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required /></label>
              <label className="field"><span>Mobile Number</span><input value={form.mobileNumber} onChange={(event) => setForm({ ...form, mobileNumber: event.target.value })} required /></label>
              <label className="field"><span>Email</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
              <label className="field"><span>Joining Date</span><input type="date" value={form.joiningDate} onChange={(event) => setForm({ ...form, joiningDate: event.target.value })} required /></label>
              <label className="field"><span>Seat Assigned</span><input value={form.assignedSeat} onChange={(event) => setForm({ ...form, assignedSeat: event.target.value })} /></label>
              <div className="form-actions"><button type="submit" className="btn btn-primary">Save Member</button></div>
            </form>
          </div>

          <div className="panel-card">
            {editingMemberId ? (
              <>
                <h4>Edit member</h4>
                <form className="form-grid" onSubmit={handleEditSubmit}>
                  <label className="field"><span>Full Name</span><input value={editForm.fullName} onChange={(event) => setEditForm({ ...editForm, fullName: event.target.value })} required /></label>
                  <label className="field"><span>Mobile Number</span><input value={editForm.mobileNumber} onChange={(event) => setEditForm({ ...editForm, mobileNumber: event.target.value })} required /></label>
                  <label className="field"><span>Email</span><input type="email" value={editForm.email} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} /></label>
                  <label className="field"><span>Joining Date</span><input type="date" value={editForm.joiningDate} onChange={(event) => setEditForm({ ...editForm, joiningDate: event.target.value })} required /></label>
                  <label className="field"><span>Seat Assigned</span><input value={editForm.assignedSeat} onChange={(event) => setEditForm({ ...editForm, assignedSeat: event.target.value })} /></label>
                  <div className="form-actions"><button type="submit" className="btn btn-secondary">Save Changes</button><button type="button" className="btn btn-ghost" onClick={() => { setEditingMemberId(null); setEditForm(emptyForm) }}>Cancel</button></div>
                </form>
              </>
            ) : (
              <>
                <h4>Renew membership</h4>
                <form className="form-grid" onSubmit={handleRenew}>
                  <label className="field"><span>Member</span><select value={selectedMemberId ?? ''} onChange={(event) => setSelectedMemberId(Number(event.target.value) || null)}><option value="">Select a member</option>{members.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}</select></label>
                  <label className="field"><span>Membership Type</span><select value={renewalForm.membershipPlan} onChange={(event) => setRenewalForm({ ...renewalForm, membershipPlan: event.target.value, monthlyDuration: event.target.value === 'Monthly' ? renewalForm.monthlyDuration : '1' })}>{membershipPlanOptions.map((plan) => <option key={plan} value={plan}>{plan}</option>)}</select></label>
                  <label className="field"><span>{renewalForm.membershipPlan === 'Monthly' ? 'Monthly Duration' : 'Duration'}</span><input type="number" min="1" max="12" value={renewalForm.monthlyDuration} onChange={(event) => setRenewalForm({ ...renewalForm, monthlyDuration: event.target.value })} disabled={renewalForm.membershipPlan !== 'Monthly'} /></label>
                  <label className="field"><span>Renewal Start</span><input type="date" value={renewalForm.membershipStartDate} onChange={(event) => setRenewalForm({ ...renewalForm, membershipStartDate: event.target.value })} /></label>
                  <label className="field full-width"><span>Notes</span><input value={renewalForm.notes} onChange={(event) => setRenewalForm({ ...renewalForm, notes: event.target.value })} /></label>
                  <div className="form-actions full-width"><button type="submit" className="btn btn-secondary">Renew Selected Member</button></div>
                </form>
                {selectedMember ? <p className="helper-text">Selected member: {selectedMember.fullName} • Current expiry {selectedMember.membershipExpiryDate}</p> : null}
              </>
            )}
          </div>
        </div>

        <div className="table-card">
          <div className="table-toolbar">
            <div><p className="eyebrow">Directory</p><h4>Member roster</h4></div>
            <div className="table-actions"><button type="button" className="btn btn-ghost" onClick={handleExportMembers}>Export CSV</button></div>
          </div>
          {loading ? <p className="empty-state">Loading members…</p> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>ID</th><th>Name</th><th>Start Date</th><th>Expiry</th><th>Seat</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr key={member.id}>
                      <td>#{member.id}</td>
                      <td>{member.fullName}</td>
                      <td>{member.membershipStartDate || '—'}</td>
                      <td>{member.membershipExpiryDate}</td>
                      <td>{member.assignedSeat ?? '—'}</td>
                      <td><span className={`badge badge-${getStatusTone(member.status)}`}>{member.status}</span></td>
                      <td>
                        <div className="inline-actions">
                          <div className="menu-wrap">
                            <button type="button" className="btn btn-ghost" onClick={() => setMemberMenuOpenId((value) => value === member.id ? null : member.id)}>⋯</button>
                            {memberMenuOpenId === member.id ? (
                              <div className="menu-popup">
                                <button type="button" className="menu-option" onClick={() => startEditingMember(member)}>Edit</button>
                                <button type="button" className="menu-option danger" onClick={() => void handleDeleteMember(member.id)}>Delete</button>
                              </div>
                            ) : null}
                          </div>
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
    </div>
  )

  const renderSeats = () => (
    <div className="content-stack">
      <section className="section-card">
        <div className="section-header"><div><p className="eyebrow">Seats</p><h3>Seat management</h3></div></div>
        <div className="two-column-grid">
          <div className="panel-card">
            <h4>Assign seat</h4>
            <form className="form-grid" onSubmit={handleSeatAssignment}>
              <label className="field"><span>Member</span><select value={seatAssignment.memberId ?? ''} onChange={(event) => setSeatAssignment({ ...seatAssignment, memberId: Number(event.target.value) || null })}><option value="">Select member</option>{members.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}</select></label>
              <label className="field"><span>Seat</span><select value={seatAssignment.seatLabel} onChange={(event) => setSeatAssignment({ ...seatAssignment, seatLabel: event.target.value })}><option value="">Select seat</option>{(Array.isArray(seats) ? seats : []).map((seat) => {
                const displayStatus = seat.status === 'reserved' ? 'occupied' : seat.status
                return <option key={seat.label} value={seat.label}>{seat.label} ({displayStatus})</option>
              })}</select></label>
              <div className="form-actions full-width"><button type="submit" className="btn btn-primary">Assign Seat</button></div>
            </form>
          </div>
          <div className="panel-card">
            <h4>Seat details</h4>
            {selectedSeat ? (selectedSeat.memberName ? <div className="seat-detail-card"><p className="eyebrow">{selectedSeat.label}</p><h4>{selectedSeat.memberName}</h4><p>Vacates on {formatDateLabel(selectedSeat.membershipExpiryDate)}</p></div> : <div className="seat-detail-card"><p className="eyebrow">{selectedSeat.label}</p><h4>Available</h4><p>Select a member above and assign this seat.</p></div>) : <p className="helper-text">Choose a seat from the map to view the occupant and vacancy date.</p>}
            <div className="legend-list"><div className="legend-item"><span className="legend-dot available" /> Available</div><div className="legend-item"><span className="legend-dot occupied" /> Occupied</div><div className="legend-item"><span className="legend-dot expiring" /> Expiring</div></div>
          </div>
        </div>
        <div className="seat-grid">
          {seatLayoutRows.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="seat-row">
              <h4>Row {row.label}</h4>
              <div className="seat-cells">
                {row.seats.map((label) => {
                  const seat = seatLookup.get(label)
                  const seatStatus = seat?.status === 'reserved' ? 'occupied' : (seat?.status ?? 'available')
                  return <button key={label} type="button" className={`seat-cell ${seatStatus}`} onClick={() => handleSeatSelection(seat ?? { label, status: 'available', memberId: null, memberName: null, membershipExpiryDate: null })}><strong>{label}</strong><span>{seat?.memberName ?? 'Available'}</span></button>
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )

  const renderPayments = () => (
    <div className="content-stack">
      <section className="section-card">
        <div className="section-header"><div><p className="eyebrow">Payments</p><h3>Collection and receipts</h3></div></div>
        <div className="two-column-grid">
          <div className="panel-card">
            <h4>Record payment</h4>
            <form className="form-grid" onSubmit={handlePaymentSubmit}>
              <label className="field"><span>Member</span><select value={paymentForm.memberId} onChange={(event) => setPaymentForm({ ...paymentForm, memberId: event.target.value })} required><option value="">Select member</option>{members.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}</select></label>
              <label className="field"><span>Assigned Seat</span><select value={paymentForm.seatLabel} onChange={(event) => setPaymentForm({ ...paymentForm, seatLabel: event.target.value })}><option value="">No seat selected</option>{(Array.isArray(seats) ? seats : []).map((seat) => <option key={seat.label} value={seat.label}>{seat.label} ({seat.status})</option>)}</select></label>
              <label className="field"><span>Membership Plan</span><select value={paymentForm.membershipPlan} onChange={(event) => setPaymentForm({ ...paymentForm, membershipPlan: event.target.value })}>{membershipPlanOptions.map((plan) => <option key={plan} value={plan}>{plan}</option>)}</select></label>
              <label className="field"><span>Membership Start Date</span><input type="date" value={paymentForm.membershipStartDate} onChange={(event) => setPaymentForm({ ...paymentForm, membershipStartDate: event.target.value })} required /></label>
              <label className="field"><span>Membership End Date</span><input type="date" value={paymentForm.membershipExpiryDate} onChange={(event) => setPaymentForm({ ...paymentForm, membershipExpiryDate: event.target.value })} required /></label>
              <label className="field"><span>Amount</span><input type="number" min="0" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} required /></label>
              <label className="field"><span>Payment Date</span><input type="date" value={paymentForm.paymentDate} onChange={(event) => setPaymentForm({ ...paymentForm, paymentDate: event.target.value })} required /></label>
              <label className="field"><span>Payment Method</span><select value={paymentForm.paymentMethod} onChange={(event) => setPaymentForm({ ...paymentForm, paymentMethod: event.target.value })}><option value="Cash">Cash</option><option value="UPI">UPI</option><option value="Card">Card</option><option value="Bank Transfer">Bank Transfer</option></select></label>
              <label className="field full-width"><span>Notes</span><input value={paymentForm.notes} onChange={(event) => setPaymentForm({ ...paymentForm, notes: event.target.value })} /></label>
              <div className="form-actions full-width"><button type="submit" className="btn btn-primary">Save Payment</button></div>
            </form>
          </div>
          <div className="panel-card">
            <h4>Payment summary</h4>
            <div className="summary-stack"><div className="summary-item"><span>Monthly revenue</span><strong>{formatCurrency(dashboard.monthlyRevenue)}</strong></div><div className="summary-item"><span>Latest receipt</span><strong>{payments[0]?.receiptNumber ?? '—'}</strong></div><div className="summary-item"><span>Records</span><strong>{payments.length}</strong></div></div>
          </div>
        </div>

        <div className="table-card">
          <div className="table-toolbar"><div><p className="eyebrow">Ledger</p><h4>Recent payments</h4></div></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Receipt</th><th>Member</th><th>Amount</th><th>Date</th><th>Method</th><th>Action</th></tr></thead>
              <tbody>
                {payments.map((payment) => {
                  const member = members.find((item) => item.id === payment.memberId)
                  return <tr key={payment.id}><td>{payment.receiptNumber}</td><td>{member?.fullName ?? 'Unknown'}</td><td>{formatCurrency(payment.amount)}</td><td>{payment.paymentDate}</td><td>{payment.paymentMethod}</td><td><button type="button" className="btn btn-ghost" onClick={() => void openReceipt(payment.id)}>View receipt</button></td></tr>
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )

  const renderReports = () => (
    <div className="content-stack">
      <section className="section-card">
        <div className="section-header"><div><p className="eyebrow">Reports</p><h3>Operational reports</h3></div></div>
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-icon">👥</div><div><p>Total members</p><strong>{reports.totalMembers}</strong></div></div>
          <div className="stat-card"><div className="stat-icon">✓</div><div><p>Active members</p><strong>{reports.activeMembers}</strong></div></div>
          <div className="stat-card"><div className="stat-icon">⚠</div><div><p>Expired</p><strong>{reports.expiredMembers}</strong></div></div>
          <div className="stat-card"><div className="stat-icon">🕒</div><div><p>Pending</p><strong>{reports.pendingMembers}</strong></div></div>
          <div className="stat-card"><div className="stat-icon">💰</div><div><p>Revenue</p><strong>{formatCurrency(reports.monthlyRevenue)}</strong></div></div>
          <div className="stat-card"><div className="stat-icon">🪑</div><div><p>Availability</p><strong>{reports.availableSeats}/{reports.occupiedSeats + reports.availableSeats}</strong></div></div>
        </div>

        <div className="two-column-grid report-grid">
          <div className="panel-card">
            <div className="section-header"><div><p className="eyebrow">Revenue</p><h4>Monthly revenue trend</h4></div><button type="button" className="btn btn-ghost" onClick={handleExportRevenueBreakdown}>Export CSV</button></div>
            <div className="mini-chart">
              {reports.revenueByMonth.length ? reports.revenueByMonth.map((entry) => {
                const maxRevenue = Math.max(...reports.revenueByMonth.map((item) => item.revenue), 1)
                const height = Math.max(28, Math.round((entry.revenue / maxRevenue) * 100))
                return (
                  <div key={entry.label} className="mini-chart-bar">
                    <div className="mini-chart-track"><div className="mini-chart-fill" style={{ height: `${height}%` }} /></div>
                    <span>{entry.label}</span>
                    <strong>{formatCurrency(entry.revenue)}</strong>
                    <small>{entry.members} contributors</small>
                  </div>
                )
              }) : <p className="helper-text">No data yet.</p>}
            </div>
          </div>

          <div className="panel-card">
            <div className="section-header"><div><p className="eyebrow">Contributors</p><h4>Revenue per month</h4></div></div>
            <div className="detail-list">
              {reports.revenueByMonth.length ? reports.revenueByMonth.map((entry) => (
                <div key={entry.label} className="detail-row">
                  <div>
                    <strong>{entry.label}</strong>
                    <p className="detail-meta">{formatCurrency(entry.revenue)} • {entry.members} contributors</p>
                  </div>
                  <span className="badge badge-success">{entry.members > 0 ? 'Tracked' : 'Pending'}</span>
                </div>
              )) : <p className="helper-text">No monthly revenue data available yet.</p>}
            </div>
          </div>
        </div>

        <div className="two-column-grid" style={{ marginTop: '18px' }}>
          <div className="panel-card"><h4>Expiring soon</h4><ul className="list-stack">{reports.expiringSoon.map((member) => <li key={member.id}>{member.fullName} — {member.membershipExpiryDate} {member.assignedSeat ? `• Seat ${member.assignedSeat}` : ''}</li>)}</ul></div>
          <div className="panel-card"><h4>Recent payments</h4><ul className="list-stack">{reports.recentPayments.map((payment) => <li key={payment.id}>{payment.receiptNumber} — {formatCurrency(payment.amount)} on {payment.paymentDate} ({payment.paymentMethod})</li>)}</ul></div>
        </div>

        <div className="two-column-grid" style={{ marginTop: '18px' }}>
          <div className="panel-card"><h4>Status breakdown</h4><div className="status-list">{reports.statusBreakdown.map((entry) => <div key={entry.label} className="summary-item"><span>{entry.label}</span><strong>{entry.count}</strong></div>)}</div></div>
          <div className="panel-card"><h4>Exports</h4><p className="helper-text">Export the full report or the revenue breakdown as a CSV file for offline sharing.</p><div className="inline-actions"><button type="button" className="btn btn-ghost" onClick={handleExportReports}>Export full report</button><button type="button" className="btn btn-secondary" onClick={handleExportRevenueBreakdown}>Export revenue CSV</button><button type="button" className="btn btn-primary" onClick={handleExportAllData}>Export JSON</button></div></div>
        </div>
      </section>
    </div>
  )

  const renderSettings = () => (
    <div className="content-stack">
      <section className="section-card">
        <div className="section-header"><div><p className="eyebrow">Settings</p><h3>Backup & restore</h3></div></div>
        <div className="two-column-grid">
          <div className="panel-card"><h4>Download backup</h4><p>Create a JSON export for members, renewals, and payments.</p><button type="button" className="btn btn-primary" onClick={() => void handleBackup()}>Download Backup</button></div>
          <div className="panel-card"><h4>Restore backup</h4><p>Import a previously exported backup file to restore the database.</p><input type="file" accept="application/json" onChange={(event) => void handleRestore(event)} />{restoreMessage ? <p className="helper-text">{restoreMessage}</p> : null}</div>
        </div>
      </section>
    </div>
  )

  const renderPage = () => {
    switch (activeSection) {
      case 'members': return renderMembers()
      case 'seats': return renderSeats()
      case 'payments': return renderPayments()
      case 'reports': return renderReports()
      case 'settings': return renderSettings()
      default: return renderDashboard()
    }
  }

  if (!auth.token) {
    return (
      <div className="app-shell login-shell">
        <div className="login-card">
          <div className="login-brand"><div className="brand-mark">RL</div><div><p className="brand-title">Raj Digital Library</p><p className="brand-subtitle">Admin Console</p></div></div>
          <div className="login-copy"><p className="eyebrow">Secure access</p><h1>Welcome back</h1><p>Sign in to manage members, payments, seats, and reports from one place.</p></div>
          {feedback ? <div className={`feedback-banner ${feedback.type}`}>{feedback.text}</div> : null}
          <form className="auth-form" onSubmit={handleLogin}>
            <label className="field"><span>Username</span><input value={loginForm.username} onChange={(event) => setLoginForm({ ...loginForm, username: event.target.value })} required /></label>
            <label className="field"><span>Password</span><input type="password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} required /></label>
            <button type="submit" className="btn btn-primary" disabled={isAuthenticating}>{isAuthenticating ? 'Signing in…' : 'Sign in'}</button>
          </form>
          <p className="helper-text">Default credentials: admin / admin123</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <ReceiptPreview receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
      <aside className="sidebar">
        <div className="brand-block"><div className="brand-mark">RL</div><div><p className="brand-title">Raj Digital Library</p><p className="brand-subtitle">Admin Console</p></div></div>
        <nav className="sidebar-nav">{navigationItems.map((item) => <button key={item.id} type="button" className={`nav-item ${activeSection === item.id ? 'active' : ''}`} onClick={() => setRoute(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav>
        <div className="sidebar-card"><p className="eyebrow">System health</p><strong>All services online</strong><p>Daily backup and receipts remain active.</p></div>
      </aside>

      <div className="main-panel">
        <header className="topbar">
          <div><p className="eyebrow">{todayLabel}</p><h2>Operations overview</h2></div>
          <div className="topbar-actions">
            <label className="search-box"><span>⌕</span><input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Search members" /></label>
            <button type="button" className="btn btn-icon" onClick={() => setIsDarkMode((value) => !value)}>{isDarkMode ? '☀' : '☾'}</button>
            {auth.username ? <button type="button" className="btn btn-ghost" onClick={handleLogout}>Logout • {auth.username}</button> : null}
            <div className="profile-pill">AD</div>
          </div>
        </header>

        <main className="content">
          {feedback ? <div className={`feedback-banner ${feedback.type}`}>{feedback.text}</div> : null}
          {renderPage()}
        </main>
      </div>
    </div>
  )
}

export default App
