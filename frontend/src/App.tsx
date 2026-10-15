import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Headphones,
  Heart,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Send,
  Settings2,
  Sparkles,
  Stethoscope,
  UserRound,
  Video,
  X,
} from 'lucide-react'
import { api, type Appointment, type Member } from './api'
import { AuthScreen } from './AuthScreen'
import './wellnest.css'

type Message = {
  id: string
  role: 'assistant' | 'user'
  text: string
  action?: 'booking'
}

const services = [
  { name: 'General checkup', icon: Stethoscope, color: 'mint' },
  { name: 'Dental care', icon: Activity, color: 'peach' },
  { name: 'Heart health', icon: Heart, color: 'blue' },
  { name: 'Video visit', icon: Video, color: 'lilac' },
]

const initialMessages: Message[] = [
  { id: 'welcome', role: 'assistant', text: "Hi! I'm here to help you find the right care. What can I help you with today?" },
]

const navigation = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Appointments', icon: CalendarDays },
  { label: 'Messages', icon: MessageCircle },
]

function Dashboard({ user, onLogout }: { user: Member; onLogout: () => void }) {
  const [activePage, setActivePage] = useState('Overview')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [chatSessionId, setChatSessionId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [isSavingBooking, setIsSavingBooking] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [today] = useState(() => new Date())
  const [notice, setNotice] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const firstName = user.fullName.split(' ')[0]
  const initials = user.fullName.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  const title = activePage === 'Appointments' ? 'Your appointments' : `Good morning, ${firstName}`

  useEffect(() => {
    let active = true
    async function loadDashboard() {
      try {
        const [appointmentResult, sessionResult] = await Promise.all([
          api.appointments.list(),
          api.chat.currentSession(),
        ])
        const historyResult = await api.chat.messages(sessionResult.session.id)
        if (!active) return
        setAppointments(appointmentResult.appointments)
        setChatSessionId(sessionResult.session.id)
        setMessages(historyResult.messages.length
          ? historyResult.messages.map((message) => ({ id: message.id, role: message.role, text: message.content }))
          : initialMessages)
      } catch (error) {
        if (active) setNotice(error instanceof Error ? error.message : 'Unable to load your care details.')
      } finally {
        if (active) setIsLoadingData(false)
      }
    }
    void loadDashboard()
    return () => { active = false }
  }, [user.id])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isTyping])

  function openChat() {
    setActivePage('Messages')
    setMobileMenuOpen(false)
    window.setTimeout(() => chatInputRef.current?.focus(), 50)
  }

  async function sendMessage(value = draft) {
    const text = value.trim()
    if (!text || isTyping) return

    const temporaryId = `pending-${Date.now()}`
    setMessages((current) => [...current, { id: temporaryId, role: 'user', text }])
    setDraft('')
    setIsTyping(true)
    try {
      if (!chatSessionId) throw new Error('Your chat is still loading. Please try again in a moment.')
      const result = await api.chat.send(chatSessionId, text)
      setMessages((current) => [...current, {
        id: result.assistantMessage.id,
        role: 'assistant',
        text: result.assistantMessage.content,
        action: result.bookingIntent ? 'booking' : undefined,
      }])
    } catch (error) {
      setMessages((current) => [...current, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        text: error instanceof Error ? error.message : 'I could not reach the scheduling service. Please try again.',
      }])
    } finally {
      setIsTyping(false)
    }
  }

  async function createAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const dateValue = String(form.get('date'))
    setIsSavingBooking(true)
    try {
      const result = await api.appointments.create({
        service: String(form.get('service')),
        clinician: String(form.get('clinician')),
        startsAt: new Date(`${dateValue}T${String(form.get('time'))}:00`).toISOString(),
      })
      setAppointments((current) => [...current, result.appointment].sort((first, second) => Date.parse(first.startsAt) - Date.parse(second.startsAt)))
      setIsBookingOpen(false)
      setActivePage('Appointments')
      setNotice('Your appointment is confirmed.')
      window.setTimeout(() => setNotice(''), 3500)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to book this appointment.')
    } finally {
      setIsSavingBooking(false)
    }
  }

  function handleNavigation(label: string) {
    setActivePage(label)
    setMobileMenuOpen(false)
    if (label === 'Messages') window.setTimeout(() => chatInputRef.current?.focus(), 50)
  }

  if (isLoadingData) {
    return <div className="page-loading"><span className="assistant-avatar"><Sparkles size={18} /></span><span>Loading your care details...</span></div>
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#overview" onClick={() => handleNavigation('Overview')}>
          <span className="brand-mark"><Heart size={18} strokeWidth={2.5} /></span>
          <span>wellnest<span className="brand-period">.</span></span>
        </a>

        <div className="workspace-label">YOUR SPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map(({ label, icon: Icon }) => (
            <button className={`nav-item ${activePage === label ? 'nav-item-active' : ''}`} key={label} onClick={() => handleNavigation(label)} type="button">
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {label === 'Messages' && <span className="nav-unread" aria-label="1 unread message" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="care-card">
            <span className="care-card-icon"><Headphones size={17} /></span>
            <p>Need a hand?</p>
            <span>Our care team is here for you.</span>
            <button type="button" onClick={openChat}>Contact support <ArrowRight size={14} /></button>
          </div>
          <button className="profile-button" type="button" onClick={() => setActivePage('Settings')}>
            <span className="avatar avatar-profile">{initials}</span>
            <span className="profile-copy"><strong>{user.fullName}</strong><small>{user.email}</small></span>
            <ChevronDown size={16} />
          </button>
        </div>
      </aside>

      {mobileMenuOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)} />}

      <div className="workspace">
        <header className="topbar">
          <button className="mobile-menu-button icon-button" type="button" aria-label="Open navigation" onClick={() => setMobileMenuOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>Member portal</span><span className="breadcrumb-slash">/</span><strong>{activePage}</strong></div>
          <label className="search-box"><Search size={16} /><input aria-label="Search appointments" placeholder="Search anything" onKeyDown={(event) => { if (event.key === 'Enter') handleNavigation('Appointments') }} /><kbd>⌘ K</kbd></label>
          <button className="topbar-avatar avatar avatar-profile" aria-label={`${user.fullName} profile`} type="button" onClick={() => setActivePage('Settings')}>{initials}</button>
        </header>

        <main className="page-content">
          {notice && <div className="notice" role="status"><Check size={16} />{notice}</div>}
          {activePage === 'Settings' ? (
            <section className="settings-view">
              <div className="eyebrow">YOUR ACCOUNT</div>
              <h1>Profile & preferences</h1>
              <p className="page-intro">Manage the details your care team uses to support you.</p>
              <div className="settings-card"><div className="settings-avatar avatar avatar-profile">{initials}</div><div><strong>{user.fullName}</strong><p>{user.email}</p></div><button type="button" className="secondary-button" onClick={onLogout}>Sign out</button></div>
              <div className="settings-card settings-preferences"><span className="settings-icon"><Settings2 size={18} /></span><div><strong>Appointment reminders</strong><p>Email and in-app reminders are enabled.</p></div><span className="toggle-on"><span /></span></div>
            </section>
          ) : (
            <>
              <div className="page-heading">
                <div><div className="eyebrow">{today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}</div><h1>{title}<span className="heading-period">.</span></h1><p className="page-intro">A little care goes a long way. Here's what's happening with your health.</p></div>
                <button className="primary-button" type="button" onClick={() => setIsBookingOpen(true)}><Plus size={17} /> Book an appointment</button>
              </div>

              <div className="dashboard-grid">
                <div className="dashboard-main">
                  {activePage === 'Overview' && (
                    <>
                      <section className="welcome-banner">
                        <div className="welcome-art" aria-hidden="true"><span className="art-sun" /><span className="art-leaf art-leaf-one" /><span className="art-leaf art-leaf-two" /><span className="art-stem" /></div>
                        <div className="welcome-copy"><span className="welcome-kicker"><Sparkles size={14} /> YOUR HEALTH, IN GOOD HANDS</span><h2>Feeling good starts<br />with showing up.</h2><p>Stay on top of your care, one visit at a time.</p><button type="button" onClick={() => handleNavigation('Appointments')}>View your care plan <ArrowRight size={15} /></button></div>
                        <div className="banner-index">01 <span>/ 03</span></div>
                      </section>

                      <section className="section-block services-section">
                        <div className="section-heading"><div><h2>Explore care</h2><p>Find the support you need</p></div><button type="button" className="text-button" onClick={() => setIsBookingOpen(true)}>All services <ArrowRight size={15} /></button></div>
                        <div className="service-grid">{services.map(({ name, icon: Icon, color }) => <button className="service-item" type="button" key={name} onClick={() => setIsBookingOpen(true)}><span className={`service-icon service-${color}`}><Icon size={20} strokeWidth={1.7} /></span><span>{name}</span><ArrowUpRight className="service-arrow" size={15} /></button>)}</div>
                      </section>
                    </>
                  )}

                  <section className="section-block appointments-section">
                    <div className="section-heading"><div><h2>{activePage === 'Appointments' ? 'All appointments' : 'Coming up'}</h2><p>{appointments.length} visits in your care plan</p></div><button type="button" className="text-button" onClick={() => setIsBookingOpen(true)}><Plus size={15} /> New booking</button></div>
                    <div className="appointment-list">{appointments.map((appointment, index) => {
                      const startsAt = new Date(appointment.startsAt)
                      const day = startsAt.toLocaleDateString('en-US', { day: 'numeric' })
                      const month = startsAt.toLocaleDateString('en-US', { month: 'short' })
                      const time = startsAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                      const statusLabel = appointment.status === 'scheduled' ? 'Confirmed' : appointment.status[0].toUpperCase() + appointment.status.slice(1)
                      return <article className="appointment-row" key={appointment.id}><div className={`appointment-date date-tone-${index % 3}`}><span>{month}</span><strong>{day}</strong></div><div className="appointment-details"><div className="appointment-title-row"><h3>{appointment.service}</h3><span className={`status status-${appointment.status === 'scheduled' ? 'confirmed' : appointment.status}`}><span />{statusLabel}</span></div><p><UserRound size={14} /> {appointment.clinician}<span className="detail-divider">·</span><Clock3 size={14} /> {time}</p></div><button className="row-arrow icon-button" aria-label={`View ${appointment.service}`} type="button" onClick={() => setNotice(`${appointment.service} with ${appointment.clinician} is ${statusLabel.toLowerCase()}.`)}><ArrowRight size={17} /></button></article>
                    })}</div>
                    {activePage === 'Appointments' && <div className="appointment-footnote"><CalendarDays size={15} /> Need to make a change? Chat with your care assistant and we'll help you out.</div>}
                  </section>
                </div>

                <aside className={`assistant-panel ${activePage === 'Messages' ? 'assistant-panel-focused' : ''}`} aria-label="Care assistant">
                  <div className="assistant-header"><div className="assistant-brand"><span className="assistant-avatar"><Sparkles size={18} /></span><div><h2>Your care assistant</h2><span><i /> Here for you, anytime</span></div></div><button className="icon-button assistant-more" title="Assistant options" type="button" onClick={() => setMessages(initialMessages)}><span>•••</span></button></div>
                  <div className="assistant-context"><span className="context-icon"><Heart size={16} /></span><span>Personalized support for your care journey</span></div>
                  <div className="chat-body" aria-live="polite"><div className="chat-day-label">TODAY · 9:41 AM</div>{messages.map((message) => <div className={`message message-${message.role}`} key={message.id}>{message.role === 'assistant' && <span className="message-avatar"><Sparkles size={12} /></span>}<div className="message-content"><p>{message.text}</p>{message.action === 'booking' && <button className="chat-book-button" type="button" onClick={() => setIsBookingOpen(true)}>Open booking form <ArrowRight size={14} /></button>}<span className="message-time">{message.role === 'user' ? 'You · now' : 'Care assistant · now'}</span></div></div>)}{isTyping && <div className="typing-indicator"><span /><span /><span /><small>Assistant is thinking</small></div>}<div className="chat-end" ref={chatEndRef} /></div>
                  {messages.length <= 1 && <div className="suggested-prompts"><span>TRY ASKING</span><button type="button" onClick={() => sendMessage('I need to book an appointment')}>Book a visit <ArrowUpRight size={13} /></button><button type="button" onClick={() => sendMessage('What should I bring to my visit?')}>Prep for my visit <ArrowUpRight size={13} /></button></div>}
                  <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); sendMessage() }}><input ref={chatInputRef} aria-label="Message your care assistant" placeholder="Ask me anything..." value={draft} onChange={(event) => setDraft(event.target.value)} /><button type="submit" disabled={!draft.trim() || isTyping} aria-label="Send message"><Send size={16} /></button></form>
                  <p className="assistant-disclaimer"><Sparkles size={12} /> Demo assistant · Not medical advice</p>
                </aside>
              </div>
            </>
          )}
        </main>
        <footer className="page-footer"><span>© 2026 Wellnest Health</span><span><span className="footer-secure"><Check size={12} /></span> Your health information is private</span></footer>
      </div>

      {isBookingOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsBookingOpen(false) }}><section className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-title"><div className="modal-heading"><div><span className="eyebrow">LET'S GET YOU THE CARE YOU NEED</span><h2 id="booking-title">Book an appointment</h2></div><button className="icon-button" type="button" aria-label="Close booking form" onClick={() => setIsBookingOpen(false)}><X size={19} /></button></div><p className="modal-intro">Choose a service and a time that works for you.</p><form className="booking-form" onSubmit={createAppointment}><label>Type of care<select name="service" defaultValue="General checkup" required>{services.map(({ name }) => <option key={name}>{name}</option>)}</select></label><label>Choose a provider<select name="clinician" defaultValue="Dr. Maya Chen" required><option>Dr. Maya Chen</option><option>Dr. James Wilson</option><option>Avery Patel, RD</option><option>First available provider</option></select></label><div className="form-row"><label>Date<input name="date" type="date" min={today.toISOString().slice(0, 10)} defaultValue={new Date(today.getTime() + 5 * 86400000).toISOString().slice(0, 10)} required /></label><label>Time<select name="time" defaultValue="09:30" required><option value="09:30">9:30 AM</option><option value="10:45">10:45 AM</option><option value="13:15">1:15 PM</option><option value="14:00">2:00 PM</option><option value="15:30">3:30 PM</option></select></label></div><div className="booking-note"><Clock3 size={15} /><span>Visits are 30 minutes. You can reschedule by contacting your care team.</span></div><div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setIsBookingOpen(false)}>Cancel</button><button className="primary-button" type="submit" disabled={isSavingBooking}>{isSavingBooking ? 'Saving...' : <><Check size={16} /> Confirm booking</>}</button></div></form></section></div>}
    </div>
  )
}

function App() {
  const [member, setMember] = useState<Member | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  useEffect(() => {
    let active = true
    api.auth.me()
      .then(({ user }) => { if (active) setMember(user) })
      .catch(() => { if (active) setMember(null) })
      .finally(() => { if (active) setIsCheckingSession(false) })
    return () => { active = false }
  }, [])

  async function logout() {
    await api.auth.logout().catch(() => undefined)
    setMember(null)
  }

  if (isCheckingSession) return <div className="page-loading"><span className="assistant-avatar"><Sparkles size={18} /></span><span>Checking your session...</span></div>
  if (!member) return <AuthScreen onAuthenticated={setMember} />
  return <Dashboard user={member} onLogout={() => { void logout() }} />
}

export default App
