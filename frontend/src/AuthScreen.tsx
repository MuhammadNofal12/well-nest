import { useState, type FormEvent } from 'react'
import { ArrowRight, Heart, ShieldCheck, Sparkles } from 'lucide-react'
import { api, type Member } from './api'

type AuthScreenProps = { onAuthenticated: (member: Member) => void }

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const result = mode === 'signup'
        ? await api.auth.signup(fullName, email, password)
        : await api.auth.login(email, password)
      onAuthenticated(result.user)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function changeMode(nextMode: 'login' | 'signup') {
    setMode(nextMode)
    setError('')
  }

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <a className="brand auth-brand" href="#home">
          <span className="brand-mark"><Heart size={18} strokeWidth={2.5} /></span>
          <span>wellnest<span className="brand-period">.</span></span>
        </a>
        <div className="auth-story-copy">
          <span className="welcome-kicker"><Sparkles size={14} /> A MORE HUMAN KIND OF HEALTHCARE</span>
          <h1>Your care,<br />considered.</h1>
          <p>Thoughtful support for every step of your health journey.</p>
        </div>
        <div className="auth-orbit" aria-hidden="true"><span className="auth-orbit-sun" /><span className="auth-orbit-leaf auth-orbit-leaf-a" /><span className="auth-orbit-leaf auth-orbit-leaf-b" /><span className="auth-orbit-stem" /></div>
        <div className="auth-story-foot"><ShieldCheck size={15} /> A private space for your care</div>
      </section>
      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand"><span className="brand-mark"><Heart size={18} strokeWidth={2.5} /></span><span>wellnest<span className="brand-period">.</span></span></div>
          <div className="eyebrow">MEMBER PORTAL</div>
          <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="auth-subtitle">{mode === 'login' ? 'Sign in to manage your appointments and care.' : 'A few details to get your care journey started.'}</p>
          <div className="auth-tabs" role="tablist" aria-label="Account access">
            <button className={mode === 'login' ? 'auth-tab active' : 'auth-tab'} onClick={() => changeMode('login')} role="tab" aria-selected={mode === 'login'} type="button">Sign in</button>
            <button className={mode === 'signup' ? 'auth-tab active' : 'auth-tab'} onClick={() => changeMode('signup')} role="tab" aria-selected={mode === 'signup'} type="button">Create account</button>
          </div>
          <form className="auth-form" onSubmit={submit}>
            {mode === 'signup' && <label>Full name<input autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Alex Morgan" required minLength={2} maxLength={80} /></label>}
            <label>Email address<input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label>
            <label>Password<input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'login' ? 'Your password' : 'At least 10 characters'} required minLength={mode === 'signup' ? 10 : 1} maxLength={128} /></label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="primary-button auth-submit" disabled={isSubmitting} type="submit">{isSubmitting ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}<ArrowRight size={16} /></button>
          </form>
          <div className="auth-security"><ShieldCheck size={15} /><span>Your session is protected with a secure, httpOnly cookie.</span></div>
          <p className="auth-disclaimer">Prototype only. Do not enter real medical or payment information.</p>
        </div>
      </section>
    </main>
  )
}
