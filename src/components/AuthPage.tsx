import { useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getLocalizedErrorMessage } from '../lib/userFacingError'
import './AuthPage.css'

type Mode = 'login' | 'signup'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode)
    setMessage('')
    setErrorMessage('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setErrorMessage('')

    if (password.length < 8) {
      setErrorMessage('비밀번호는 8자 이상으로 입력해 주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password)
        if (error) throw error
        setMessage('로그인되었습니다.')
      } else {
        const { error, needsEmailConfirmation } = await signUp(
          email,
          password,
          displayName,
        )
        if (error) throw error
        setMessage(
          needsEmailConfirmation
            ? '가입 확인 메일을 보냈습니다. 이메일 인증 후 로그인해 주세요.'
            : '계정이 생성되었습니다. MY DESK를 시작해 보세요.',
        )
        if (needsEmailConfirmation) setMode('login')
      }
    } catch (error) {
      const message = getLocalizedErrorMessage(error)
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand">
          <span className="auth-brand-mark" aria-hidden="true">✳</span>
          <span>MY DESK</span>
        </div>

        <div className="auth-heading">
          <p className="auth-eyebrow">YOUR PERSONAL WORKSPACE</p>
          <h1 id="auth-title">
            {mode === 'login' ? '다시 만나서 반가워요.' : 'MY DESK 시작하기'}
          </h1>
          <p>
            {mode === 'login'
              ? '로그인하고 나만의 작업 공간을 이어서 사용하세요.'
              : '계정을 만들고 자료와 일정을 한곳에 모아보세요.'}
          </p>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="로그인 방식">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={mode === 'login' ? 'is-active' : ''}
            onClick={() => switchMode('login')}
          >
            로그인
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={mode === 'signup' ? 'is-active' : ''}
            onClick={() => switchMode('signup')}
          >
            회원가입
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <label>
              이름
              <input
                autoComplete="name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="이름 또는 닉네임"
                maxLength={40}
              />
            </label>
          )}

          <label>
            이메일
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              required
            />
          </label>

          <label>
            비밀번호
            <input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="8자 이상 입력"
              minLength={8}
              required
            />
          </label>

          {errorMessage && <p className="auth-alert is-error" role="alert">{errorMessage}</p>}
          {message && <p className="auth-alert is-success" role="status">{message}</p>}

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? '처리 중...'
              : mode === 'login'
                ? '로그인'
                : '계정 만들기'}
            <span aria-hidden="true">→</span>
          </button>
        </form>

        <p className="auth-footnote">
          로그인하면 나의 자료와 일정이 계정에 안전하게 연결됩니다.
        </p>
      </section>
      <aside className="auth-side" aria-hidden="true">
        <div className="auth-side-orb orb-one" />
        <div className="auth-side-orb orb-two" />
        <div className="auth-side-content">
          <span className="auth-side-kicker">ONE PLACE FOR EVERYTHING</span>
          <h2>생각은 가볍게,<br />정리는 단단하게.</h2>
          <p>노트, 일정, 프로젝트와 나만의 AI 도구를<br />한곳에서 관리하세요.</p>
          <div className="auth-side-pills">
            <span>NOTES</span><span>PLANNER</span><span>AI LIBRARY</span>
          </div>
        </div>
        <div className="auth-side-bottom">MY DESK · YOUR SPACE</div>
      </aside>
    </main>
  )
}
