import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'
import { Eye, EyeOff, Shield, ArrowRight, Loader2 } from 'lucide-react'

const loginAnimations = `
  @keyframes radar-sweep {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes ping-pulse {
    0%   { transform: scale(1);   opacity: 0.8; }
    70%  { transform: scale(2.6); opacity: 0;   }
    100% { transform: scale(2.6); opacity: 0;   }
  }
  @keyframes live-blink {
    0%, 100% { opacity: 1;   }
    50%      { opacity: 0.3; }
  }
  .anim-radar   { animation: radar-sweep  6s  linear       infinite; }
  .anim-ping-0  { animation: ping-pulse   2.5s ease-out    infinite; }
  .anim-ping-1  { animation: ping-pulse   2.5s ease-out    infinite 0.9s; }
  .anim-ping-2  { animation: ping-pulse   2.5s ease-out    infinite 1.8s; }
  .anim-blink   { animation: live-blink   2s   ease-in-out infinite; }
`

function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [requestedRole, setRequestedRole] = useState('moderator')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [applySubmitted, setApplySubmitted] = useState(false)

  useEffect(() => {
    setError('')
    setFieldErrors({})
    setSuccessMessage('')
    setApplySubmitted(false)
  }, [mode])

  const validateLogin = () => {
    const errs = {}
    if (!email) errs.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Invalid email address'
    if (!password) errs.password = 'Password is required'
    else if (password.length < 6) errs.password = 'Minimum 6 characters'
    return errs
  }

  const handleLoginSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    const errs = validateLogin()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setFieldErrors({})
    setError('')
    setSuccessMessage('')
    setLoading(true)
    try {
      const result = await login(email, password)
      if (result.success) {
        setSuccessMessage('Access Granted')
        setTimeout(() => navigate('/'), 500)
      } else {
        setError(result.error || 'Invalid credentials')
      }
    } catch (_error) {
      setError('Unable to login right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleApplicationSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setLoading(true)
    try {
      const result = await authAPI.register({
        username,
        email,
        password,
        role: requestedRole,
      })
      if (result.success) {
        setApplySubmitted(true)
        setUsername('')
        setEmail('')
        setPassword('')
      } else {
        setError(result.error || 'Registration failed')
      }
    } catch (_error) {
      setError('Unable to submit application right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAutoFill = () => {
    setEmail('moderator@safesignal.com')
    setPassword('password123')
    setError('')
    setFieldErrors({})
  }

  const IconEmail = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/>
    </svg>
  )
  const IconLock = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
  )
  const IconUser = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  )
  const IconShieldCheck = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
    </svg>
  )
  const IconAlert = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )

  const inputBase = [
    'w-full bg-[#0D1117] border text-[#D9E4F0] font-medium text-[13px]',
    'pl-9 pr-4 py-[11px] outline-none transition-colors duration-150 rounded-none',
    'placeholder:text-[#3D4F65] placeholder:font-normal',
    'focus:bg-[rgba(0,240,255,0.03)]',
  ].join(' ')
  const fieldLabel = 'block text-[10px] font-bold tracking-[0.06em] uppercase text-[#3D4F65] mb-[7px]'
  const fieldErrorRow = 'flex items-center gap-1 mt-1 text-[10px] font-semibold text-[#ff3333]'

  return (
    <>
      <style>{loginAnimations}</style>

      <div className="flex h-dvh w-full overflow-hidden bg-[#07090B] font-display text-[#D9E4F0]">

        {/* ══════════ LEFT PANEL ══════════ */}
        <div className="hidden lg:flex w-[60%] relative flex-col justify-between p-12 border-r border-[#1C2430] overflow-hidden">

          {/* Grid texture */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(rgba(28,36,48,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(28,36,48,0.5) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          {/* Radial fade */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 70% 60% at 40% 50%, transparent 0%, #07090B 100%)' }}
          />

          {/* Radar rings + sweep (opacity animated only) */}
          <div className="absolute right-[-80px] top-1/2 -translate-y-1/2 w-[560px] h-[560px] opacity-[0.08] pointer-events-none">
            {[560, 420, 280, 140].map(s => (
              <div
                key={s}
                className="absolute rounded-full border border-[#00f0ff]"
                style={{ width: s, height: s, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
              />
            ))}
            <div
              className="absolute inset-0 rounded-full anim-radar"
              style={{ background: 'conic-gradient(from 0deg, transparent 340deg, rgba(0,240,255,0.7) 360deg)' }}
            />
          </div>

          {/* Signal pulse dots */}
          {[
            { top: '38%', left: '44%', color: '#00f0ff', pingCls: 'anim-ping-0' },
            { top: '55%', left: '52%', color: '#ff3333', pingCls: 'anim-ping-1' },
            { top: '46%', left: '35%', color: '#30A46C', pingCls: 'anim-ping-2' },
          ].map((p, i) => (
            <div key={i} className="absolute pointer-events-none" style={{ top: p.top, left: p.left }}>
              <div className="relative w-2 h-2">
                <div className="absolute inset-0 rounded-full" style={{ background: p.color }} />
                <div className={`absolute inset-0 rounded-full ${p.pingCls}`} style={{ background: p.color }} />
              </div>
            </div>
          ))}

          {/* Decorative map roads */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
            <line x1="0"   y1="240" x2="800" y2="270" stroke="#00f0ff" strokeWidth="1.5"/>
            <line x1="0"   y1="340" x2="800" y2="310" stroke="#00f0ff" strokeWidth="1"/>
            <line x1="280" y1="0"   x2="320" y2="600" stroke="#00f0ff" strokeWidth="1.5"/>
            <line x1="500" y1="0"   x2="480" y2="600" stroke="#00f0ff" strokeWidth="1"/>
            <line x1="0"   y1="160" x2="800" y2="180" stroke="#00f0ff" strokeWidth="0.5"/>
            <line x1="0"   y1="450" x2="800" y2="430" stroke="#00f0ff" strokeWidth="0.5"/>
            <line x1="140" y1="0"   x2="150" y2="600" stroke="#00f0ff" strokeWidth="0.5"/>
            <line x1="660" y1="0"   x2="650" y2="600" stroke="#00f0ff" strokeWidth="0.5"/>
          </svg>

          {/* Brand */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 border border-[#00f0ff] shrink-0">
              <Shield className="w-[18px] h-[18px] text-[#D9E4F0]" />
            </div>
            <span className="font-display font-extrabold text-lg tracking-[0.03em] uppercase">SafeSignal</span>
          </div>

          {/* Hero */}
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-px bg-[#00f0ff]" />
              <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#00f0ff]">Secure Operations Access</span>
            </div>
            <h1 className="font-display font-extrabold leading-[1.05] tracking-tight text-balance mb-6" style={{ fontSize: 'clamp(36px, 3.5vw, 52px)' }}>
              Community Safety.<br />
              <span className="text-[#00f0ff]">Command-Level</span><br />
              Intelligence.
            </h1>
            <p className="text-sm font-normal leading-[1.7] text-[#5C7390] max-w-[440px] text-pretty">
              Real-time incident monitoring, law enforcement coordination, and moderator oversight — all in one secure environment.
            </p>
            <div className="flex gap-10 mt-12">
              {[
                { value: '43', unit: '+', label: 'Active Reports' },
                { value: '12', unit: 'h',  label: 'Avg. Response' },
                { value: '98', unit: '%',  label: 'Uptime' },
              ].map(s => (
                <div key={s.label}>
                  <div className="font-display font-extrabold text-[28px] leading-none tabular-nums text-[#D9E4F0] mb-1">
                    {s.value}<span className="text-base text-[#00f0ff]">{s.unit}</span>
                  </div>
                  <div className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#3D4F65]">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom status */}
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#30A46C] anim-blink" />
              <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#5C7390]">
                System Operational — Mount Lebanon Region
              </span>
            </div>
            <p className="text-[11px] font-medium text-[#3D4F65]">All sessions are encrypted and logged.</p>
          </div>
        </div>

        {/* ══════════ RIGHT PANEL ══════════ */}
        <div className="w-full lg:w-[40%] bg-[#0D1117] border-l border-[#1C2430] relative flex flex-col justify-center px-11 py-12 overflow-y-auto">

          {/* Corner accent */}
          <div className="absolute top-0 left-0 w-px h-20 bg-[#00f0ff]" />
          <div className="absolute top-0 left-0 w-20 h-px bg-[#00f0ff]" />

          <div className="max-w-[360px] w-full mx-auto">

            {/* Header */}
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-[10px]">
                <span className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#00f0ff]">Moderator Portal</span>
                <div className="flex-1 h-px bg-[#243040]" />
              </div>
              <h2 className="font-display font-extrabold text-2xl tracking-[0.01em] uppercase text-[#D9E4F0] mb-1.5 text-balance">
                {mode === 'login' ? 'Sign In' : 'Request Access'}
              </h2>
              <p className="text-xs font-medium text-[#5C7390]">
                {mode === 'login' ? 'Authorized personnel only' : 'Submit your access request for review'}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex border border-[#243040] mb-8">
              {[
                { key: 'login', label: 'Login' },
                { key: 'apply', label: 'Apply Access' },
              ].map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setMode(t.key)}
                  className={[
                    'flex-1 py-[9px] text-[11px] font-bold tracking-[0.04em] uppercase transition-colors duration-150',
                    'border-r border-[#243040] last:border-r-0',
                    mode === t.key
                      ? 'bg-[rgba(0,240,255,0.08)] text-[#00f0ff]'
                      : 'bg-transparent text-[#3D4F65] hover:bg-[#131920] hover:text-[#D9E4F0]',
                  ].join(' ')}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── LOGIN ── */}
            {mode === 'login' && (
              successMessage ? (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <div className="flex items-center justify-center w-[52px] h-[52px] rounded-full border-2 border-[#30A46C] text-[#30A46C]">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <div className="font-display font-extrabold text-base tracking-[0.04em] uppercase text-[#D9E4F0]">Access Granted</div>
                  <div className="text-xs font-medium text-[#5C7390]">Redirecting to dashboard…</div>
                </div>
              ) : (
                <form onSubmit={handleLoginSubmit} noValidate>
                  <div className="mb-5">
                    <label className={fieldLabel} htmlFor="login-email">Email Address</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-[#3D4F65] pointer-events-none flex items-center"><IconEmail /></span>
                      <input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@safesignal.com"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: null })) }}
                        className={`${inputBase} ${fieldErrors.email ? 'border-[#ff3333]' : 'border-[#243040] focus:border-[#00f0ff]'}`}
                      />
                    </div>
                    {fieldErrors.email && <div className={fieldErrorRow}><IconAlert />{fieldErrors.email}</div>}
                  </div>

                  <div className="mb-5">
                    <label className={fieldLabel} htmlFor="login-password">Password</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-[#3D4F65] pointer-events-none flex items-center"><IconLock /></span>
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="••••••••••"
                        value={password}
                        onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: null })) }}
                        onKeyDown={e => e.key === 'Enter' && handleLoginSubmit(e)}
                        className={`${inputBase} pr-10 ${fieldErrors.password ? 'border-[#ff3333]' : 'border-[#243040] focus:border-[#00f0ff]'}`}
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword(p => !p)}
                        className="absolute right-2.5 text-[#3D4F65] hover:text-[#D9E4F0] transition-colors p-1 flex items-center"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {fieldErrors.password && <div className={fieldErrorRow}><IconAlert />{fieldErrors.password}</div>}
                    {error && !fieldErrors.email && !fieldErrors.password && (
                      <div className={fieldErrorRow}><IconAlert />{error}</div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="relative w-full mt-7 py-[13px] flex items-center justify-center gap-2 font-display font-extrabold text-xs tracking-[0.08em] uppercase border border-primary bg-primary text-black transition-opacity duration-150 hover:opacity-90 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Sign In</span><ArrowRight className="w-3.5 h-3.5" /></>}
                  </button>

                  <div className="mt-6 p-3.5 bg-[rgba(0,240,255,0.03)] border border-[#1C2430] border-l-2 border-l-[#00f0ff]">
                    <div className="text-[9px] font-bold tracking-[0.08em] uppercase text-[#00f0ff] mb-1.5">Demo Credentials</div>
                    <div className="text-[11px] font-medium text-[#5C7390] leading-[1.7] tabular-nums">
                      moderator@safesignal.com<br />password123
                    </div>
                    <button
                      type="button"
                      onClick={handleAutoFill}
                      className="flex items-center gap-1 mt-1.5 text-[10px] font-bold tracking-[0.04em] uppercase text-[#00f0ff] hover:opacity-70 transition-opacity"
                    >
                      ↗ Auto-fill credentials
                    </button>
                  </div>
                </form>
              )
            )}

            {/* ── APPLY ACCESS ── */}
            {mode === 'apply' && (
              applySubmitted ? (
                <div className="p-5 bg-[rgba(48,164,108,0.05)] border border-[#1C2430] border-l-2 border-l-[#30A46C]">
                  <div className="flex items-center gap-2 mb-3 font-display font-extrabold text-sm tracking-[0.04em] uppercase text-[#30A46C]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Request Submitted
                  </div>
                  <p className="text-xs text-[#5C7390] leading-[1.7] mb-4">
                    Your access request has been received. An administrator will review it and contact you at{' '}
                    <strong className="text-[#D9E4F0]">{email || 'your email'}</strong> shortly.
                    Your account stays pending until approved.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setApplySubmitted(false); setMode('login') }}
                    className="text-[10px] font-bold tracking-[0.04em] uppercase text-[#5C7390] border border-[#243040] px-3.5 py-1.5 hover:text-[#D9E4F0] transition-colors"
                  >
                    ← Back to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplicationSubmit}>
                  <p className="text-xs leading-[1.7] text-[#5C7390] border-l-2 border-[#243040] pl-3 mb-6">
                    Access is restricted to authorized community safety staff. Fill in your details and an administrator will review your request.
                  </p>

                  <div className="mb-5">
                    <label className={fieldLabel} htmlFor="apply-username">Username</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-[#3D4F65] pointer-events-none flex items-center"><IconUser /></span>
                      <input id="apply-username" type="text" placeholder="jdoe_mod" value={username}
                        onChange={e => setUsername(e.target.value)} minLength={3} required
                        className={`${inputBase} border-[#243040] focus:border-[#00f0ff]`} />
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className={fieldLabel} htmlFor="apply-email">Work Email</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-[#3D4F65] pointer-events-none flex items-center"><IconEmail /></span>
                      <input id="apply-email" type="email" placeholder="you@organization.com" value={email}
                        onChange={e => setEmail(e.target.value)} required
                        className={`${inputBase} border-[#243040] focus:border-[#00f0ff]`} />
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className={fieldLabel} htmlFor="apply-password">Password</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-[#3D4F65] pointer-events-none flex items-center"><IconLock /></span>
                      <input id="apply-password" type={showPassword ? 'text' : 'password'}
                        placeholder="At least 6 characters" value={password}
                        onChange={e => setPassword(e.target.value)} minLength={6} required
                        className={`${inputBase} pr-10 border-[#243040] focus:border-[#00f0ff]`} />
                      <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword(p => !p)}
                        className="absolute right-2.5 text-[#3D4F65] hover:text-[#D9E4F0] transition-colors p-1 flex items-center">
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className={fieldLabel} htmlFor="apply-role">Requested Role</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-[#3D4F65] pointer-events-none flex items-center"><IconShieldCheck /></span>
                      <select id="apply-role" value={requestedRole} onChange={e => setRequestedRole(e.target.value)}
                        className={`${inputBase} border-[#243040] focus:border-[#00f0ff] appearance-none`}>
                        <option value="moderator">Moderator</option>
                        <option value="law_enforcement">Law Enforcement</option>
                      </select>
                    </div>
                  </div>

                  {error && <div className={`${fieldErrorRow} mb-3`}><IconAlert />{error}</div>}

                  <button type="submit" disabled={loading}
                    className="w-full mt-2 py-[13px] flex items-center justify-center gap-2 font-display font-extrabold text-xs tracking-[0.08em] uppercase border border-primary bg-primary text-black transition-opacity duration-150 hover:opacity-90 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Submit Request</span><ArrowRight className="w-3.5 h-3.5" /></>}
                  </button>
                </form>
              )
            )}

            {/* Security footer */}
            <div className="flex items-center gap-1.5 mt-5 text-[10px] font-semibold tracking-[0.02em] text-[#3D4F65]">
              <IconShieldCheck />
              256-bit encrypted · Session logged · Lebanon data residency
            </div>

          </div>
        </div>

      </div>
    </>
  )
}

export default Login
