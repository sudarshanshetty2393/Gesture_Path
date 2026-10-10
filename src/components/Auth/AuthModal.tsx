import React, { useState } from 'react';
import { HandSkeleton } from '../Brand/HandSkeleton';
import { Mail, Lock, User, Eye, EyeOff, Hand, MessageSquareText, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login'
}) => {
  const { login, signup, isLoading } = useAuth();
  const [slowConnection, setSlowConnection] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSlowConnection(false);
    const slowTimer = setTimeout(() => setSlowConnection(true), 5000);
    try {
      if (mode === 'login') {
        await login(formData.email, formData.password);
      } else {
        await signup(formData.name, formData.email, formData.password);
      }
      clearTimeout(slowTimer);
      onClose();
    } catch (err) {
      clearTimeout(slowTimer);
      setSlowConnection(false);
      setError(mode === 'login' ? 'Invalid email or password' : 'Failed to create account. Try again.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const inputWithIcon = 'input h-12 pl-11 bg-surface/80';
  const stagger = (i: number) => ({ animationDelay: `${120 + i * 70}ms` });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-canvas">
      <AnimatedBackdrop />

      <div className="relative min-h-full flex items-center justify-center px-5 py-10 lg:py-12">
        <div className="w-full max-w-6xl grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-center">

          {/* ── Story side ─────────────────────────────────────────── */}
          <section className="hidden lg:block">
            <div className="flex items-center gap-3 mb-10 animate-rise-in-slow">
              <img src="/images/Logo.svg" alt="" className="w-10 h-10 rounded-xl shadow-soft" />
              <span className="text-lg font-bold tracking-tight text-ink">Gesture Path</span>
            </div>

            <SignViewfinder />

            <h2 className="mt-10 text-[44px] leading-[1.06] font-extrabold tracking-tight text-ink animate-rise-in-slow" style={{ animationDelay: '150ms' }}>
              Every sign,{' '}
              <span className="bg-gradient-to-r from-brand to-sign bg-clip-text text-transparent">understood</span>
            </h2>
            <p className="mt-4 text-lg text-ink-2 leading-relaxed max-w-lg animate-rise-in-slow" style={{ animationDelay: '250ms' }}>
              Type or speak and watch an avatar sign it in ISL. Sign to your camera and get text and speech back.
            </p>
            <ul className="mt-8 flex flex-wrap gap-2.5">
              {[
                { icon: MessageSquareText, text: '860 avatar signs' },
                { icon: Hand, text: '263 signs recognised' },
                { icon: ShieldCheck, text: 'Video stays on your device' },
              ].map(({ icon: Icon, text }, i) => (
                <li
                  key={text}
                  className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full bg-surface/80 backdrop-blur border border-line text-sm font-medium text-ink-2 shadow-soft animate-rise-in-slow"
                  style={{ animationDelay: `${350 + i * 90}ms` }}
                >
                  <Icon size={15} className={i === 1 ? 'text-sign' : 'text-brand'} />
                  {text}
                </li>
              ))}
            </ul>
          </section>

          {/* ── Form side ──────────────────────────────────────────── */}
          <main className="w-full max-w-[440px] mx-auto">
            {/* Mobile: brand + small animated hand */}
            <div className="lg:hidden flex flex-col items-center text-center mb-6 animate-rise-in-slow">
              <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-brand to-sign shadow-lift flex items-center justify-center mb-4 overflow-hidden">
                <div aria-hidden="true" className="absolute inset-0 opacity-30 animate-drift" style={DOT_GRID} />
                <HandSkeleton size={70} holdMs={2200} from="#ffffff" to="#ccfbf1" dotColor="#ffffff" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-ink">Gesture Path</span>
              <span className="text-sm text-ink-3">Indian Sign Language, both ways</span>
            </div>

            {/* Card with animated glowing border */}
            <div className="relative rounded-[28px] p-[1.5px] overflow-hidden shadow-lift animate-rise-in-slow" style={{ animationDelay: '80ms' }}>
              <div
                aria-hidden="true"
                className="absolute -inset-[60%] animate-spin-slow"
                style={{ background: 'conic-gradient(from 0deg, transparent 0deg, rgb(var(--brand)) 60deg, rgb(var(--sign)) 120deg, transparent 180deg, transparent 360deg)' }}
              />
              <div className="relative rounded-[26.5px] bg-surface/95 backdrop-blur-xl px-6 py-7 sm:px-8 sm:py-9">
                <div className="flex items-center gap-3 mb-6 animate-rise-in" style={stagger(0)}>
                  <div className="relative w-12 h-12 rounded-2xl bg-brand-soft flex items-center justify-center overflow-hidden flex-shrink-0">
                    <HandSkeleton size={30} holdMs={1800} from="rgb(var(--brand))" to="rgb(var(--sign))" dotColor="rgb(var(--brand))" />
                  </div>
                  <div>
                    <h1 className="text-[26px] leading-tight font-extrabold tracking-tight text-ink">
                      {mode === 'login' ? 'Welcome back' : 'Join Gesture Path'}
                    </h1>
                    <p className="text-sm text-ink-3">
                      {mode === 'login' ? 'Sign in to keep the conversation going.' : 'Create an account to start translating.'}
                    </p>
                  </div>
                </div>

                {/* Segmented control with sliding indicator */}
                <div className="relative grid grid-cols-2 p-1 mb-6 rounded-xl bg-surface-2 border border-line animate-rise-in" style={stagger(1)} role="tablist">
                  <span
                    aria-hidden="true"
                    className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg bg-surface shadow-soft transition-transform duration-300 ease-out"
                    style={{ transform: mode === 'signup' ? 'translateX(100%)' : 'translateX(0)' }}
                  />
                  {(['login', 'signup'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      role="tab"
                      aria-selected={mode === m}
                      onClick={() => { setMode(m); setError(''); }}
                      className={`relative h-9 rounded-lg text-sm font-semibold transition-colors ${mode === m ? 'text-ink' : 'text-ink-3 hover:text-ink-2'}`}
                    >
                      {m === 'login' ? 'Sign In' : 'Sign Up'}
                    </button>
                  ))}
                </div>

                {error && (
                  <div role="alert" className="mb-4 px-3.5 py-3 rounded-xl bg-danger-soft border border-danger/20 text-danger text-sm animate-pop">
                    {error}
                  </div>
                )}
                {slowConnection && (
                  <div role="status" className="mb-4 px-3.5 py-3 rounded-xl bg-warn-soft border border-warn/20 text-warn-ink text-sm animate-pop">
                    Server is waking up, please wait…
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4" key={mode}>
                  {mode === 'signup' && (
                    <label className="block animate-rise-in" style={stagger(2)}>
                      <span className="block text-[13px] font-semibold text-ink-2 mb-1.5">Full name</span>
                      <span className="relative block">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" size={16} />
                        <input type="text" name="name" value={formData.name} onChange={handleInputChange} className={inputWithIcon} placeholder="Your name" autoComplete="name" required />
                      </span>
                    </label>
                  )}

                  <label className="block animate-rise-in" style={stagger(3)}>
                    <span className="block text-[13px] font-semibold text-ink-2 mb-1.5">Email</span>
                    <span className="relative block">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" size={16} />
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} className={inputWithIcon} placeholder="you@example.com" autoComplete="email" required />
                    </span>
                  </label>

                  <label className="block animate-rise-in" style={stagger(4)}>
                    <span className="block text-[13px] font-semibold text-ink-2 mb-1.5">Password</span>
                    <span className="relative block">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" size={16} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className={`${inputWithIcon} pr-12`}
                        placeholder={mode === 'login' ? 'Your password' : 'Create a password'}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 icon-btn"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative btn btn-primary btn-lg w-full !mt-6 overflow-hidden animate-rise-in"
                    style={stagger(5)}
                  >
                    <span aria-hidden="true" className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                    {isLoading && <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                    <span className="relative">{isLoading ? 'Processing…' : mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                    {!isLoading && <ArrowRight size={16} className="relative group-hover:translate-x-0.5 transition-transform" />}
                  </button>
                </form>

                <p className="text-sm text-ink-3 text-center mt-6 animate-rise-in" style={stagger(6)}>
                  {mode === 'login' ? 'New to Gesture Path?' : 'Already have an account?'}{' '}
                  <button
                    type="button"
                    onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
                    className="font-semibold text-brand hover:text-brand-hover"
                  >
                    {mode === 'login' ? 'Create an account' : 'Sign in'}
                  </button>
                </p>
              </div>
            </div>

            <p className="text-xs text-ink-3 text-center mt-5 animate-fade-in" style={{ animationDelay: '600ms' }}>
              Built for the Deaf and hard-of-hearing community.
            </p>
          </main>
        </div>
      </div>
    </div>
  );
};

const DOT_GRID: React.CSSProperties = {
  backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.9) 1.2px, transparent 1.3px)',
  backgroundSize: '16px 16px',
};

/** Slowly moving colour fields and a drifting dot grid behind the whole page. */
const AnimatedBackdrop: React.FC = () => (
  <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none">
    <div className="absolute -top-40 -left-32 w-[560px] h-[560px] rounded-full bg-brand/20 dark:bg-brand/25 blur-[110px] animate-float-a" />
    <div className="absolute top-1/3 -right-40 w-[520px] h-[520px] rounded-full bg-sign/20 dark:bg-sign/20 blur-[110px] animate-float-b" />
    <div className="absolute -bottom-48 left-1/4 w-[480px] h-[480px] rounded-full bg-indigo-400/15 dark:bg-indigo-500/15 blur-[120px] animate-float-a" style={{ animationDelay: '-6s' }} />
    <div
      className="absolute inset-0 animate-drift opacity-[0.35] dark:opacity-[0.25]"
      style={{
        backgroundImage: 'radial-gradient(rgb(var(--ink-3) / 0.5) 1px, transparent 1.2px)',
        backgroundSize: '24px 24px',
        maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 75%)',
      }}
    />
  </div>
);

const CONFIDENCE: Record<string, number> = { hello: 96, one: 93, two: 91, 'I love you': 94, yes: 89 };

/** A mock "camera" showing a tracked hand and the live recognition result. */
const SignViewfinder: React.FC = () => {
  const [label, setLabel] = useState('hello');
  return (
    <div className="relative w-full max-w-[520px] aspect-[16/11] rounded-3xl overflow-hidden shadow-lift animate-rise-in-slow bg-[linear-gradient(135deg,#1e3a8a_0%,#1d4ed8_45%,#0f766e_100%)]">
      <div aria-hidden="true" className="absolute inset-0 opacity-20 animate-drift" style={DOT_GRID} />
      <div aria-hidden="true" className="absolute -top-20 -right-16 w-72 h-72 rounded-full bg-white/15 blur-3xl animate-float-b" />

      {/* Viewfinder corners */}
      {['top-4 left-4 border-t-2 border-l-2 rounded-tl-xl', 'top-4 right-4 border-t-2 border-r-2 rounded-tr-xl',
        'bottom-4 left-4 border-b-2 border-l-2 rounded-bl-xl', 'bottom-4 right-4 border-b-2 border-r-2 rounded-br-xl'].map((c) => (
        <span key={c} aria-hidden="true" className={`absolute w-8 h-8 border-white/70 ${c}`} />
      ))}

      {/* Scan line */}
      <span aria-hidden="true" className="absolute left-6 right-6 h-px bg-gradient-to-r from-transparent via-teal-200 to-transparent shadow-[0_0_12px_2px_rgba(94,234,212,0.6)] animate-scan" />

      <div className="absolute top-5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-black/30 backdrop-blur text-[10px] font-bold uppercase tracking-wider text-white">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> Live · 21 landmarks
      </div>

      <div className="absolute inset-x-0 top-12 bottom-[96px] flex items-center justify-center">
        <HandSkeleton size={128} onPoseChange={setLabel} />
      </div>

      {/* Recognition result */}
      <div key={label} className="absolute bottom-5 left-1/2 -translate-x-1/2 min-w-[200px] px-4 py-2.5 rounded-2xl bg-white/95 dark:bg-gray-900/90 backdrop-blur shadow-lift animate-pop">
        <div className="flex items-center justify-between gap-6">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Recognised</span>
          <span className="text-[11px] font-semibold text-sign-ink">{CONFIDENCE[label] ?? 90}%</span>
        </div>
        <div className="text-lg font-extrabold tracking-tight text-ink leading-tight">“{label}”</div>
        <div className="mt-1.5 h-1 rounded-full bg-surface-3 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-brand to-sign origin-left animate-bar-fill" style={{ width: `${CONFIDENCE[label] ?? 90}%` }} />
        </div>
      </div>
    </div>
  );
};
