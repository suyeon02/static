import { useEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react'
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
  const [terminalInput, setTerminalInput] = useState('')
  const [terminalOutput, setTerminalOutput] = useState('')
  const [mascotMessage, setMascotMessage] = useState('안녕하세요!')
  const [isMascotSpeaking, setIsMascotSpeaking] = useState(false)
  const [isMascotHappy, setIsMascotHappy] = useState(false)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const mascotRef = useRef<HTMLButtonElement>(null)
  const mascotFaceRef = useRef<HTMLSpanElement>(null)
  const isPointerNearMascotRef = useRef(false)
  const speechTimeoutRef = useRef<number | null>(null)
  const speechFrameRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (speechTimeoutRef.current !== null) {
        window.clearTimeout(speechTimeoutRef.current)
      }
      if (speechFrameRef.current !== null) {
        window.cancelAnimationFrame(speechFrameRef.current)
      }
    },
    [],
  )

  function showMascotSpeech(text: string) {
    if (speechTimeoutRef.current !== null) {
      window.clearTimeout(speechTimeoutRef.current)
    }
    if (speechFrameRef.current !== null) {
      window.cancelAnimationFrame(speechFrameRef.current)
    }

    setIsMascotSpeaking(false)
    setMascotMessage(text)
    speechFrameRef.current = window.requestAnimationFrame(() => {
      setIsMascotSpeaking(true)
      speechFrameRef.current = null
    })
    speechTimeoutRef.current = window.setTimeout(() => {
      setIsMascotSpeaking(false)
      speechTimeoutRef.current = null
    }, 2400)
  }

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
            : '계정이 생성되었습니다. STATIC을 시작해 보세요.',
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

  function handleTerminalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const command = terminalInput.trim().toLowerCase()
    setTerminalInput('')
    if (!command) return

    switch (command) {
      case 'help':
        setTerminalOutput('사용 가능한 명령: blob, talk, status, login, clear')
        break
      case 'blob':
      case 'cat':
      case 'pet':
        setTerminalOutput('데이터 슬라임을 불렀어요!')
        showMascotSpeech('히히, 불렀어요?')
        setIsMascotHappy(true)
        break
      case 'talk':
      case 'hello':
      case 'hi':
        setTerminalOutput('슬라임이 인사를 전해요.')
        showMascotSpeech('반가워요!')
        setIsMascotHappy(true)
        break
      case 'login':
        setTerminalOutput('이메일 입력란으로 이동합니다.')
        emailInputRef.current?.focus()
        break
      case 'status':
        setTerminalOutput(
          `시스템: 온라인 · 슬라임: ${isMascotHappy ? '행복' : '대기 중'}`,
        )
        break
      case 'clear':
        setTerminalOutput('')
        break
      default:
        setTerminalOutput(`알 수 없는 명령: ${command}`)
    }
  }

  function handleSidePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const mascot = mascotRef.current
    const face = mascotFaceRef.current
    if (!mascot || !face) return

    const mascotBounds = mascot.getBoundingClientRect()
    const deltaX = event.clientX - (mascotBounds.left + mascotBounds.width / 2)
    const deltaY = event.clientY - (mascotBounds.top + mascotBounds.height / 2)
    const distance = Math.hypot(deltaX, deltaY)
    const isNearMascot = distance < 170

    if (isNearMascot && !isPointerNearMascotRef.current) {
      showMascotSpeech('잡아봐요!')
    }
    if (distance > 220) isPointerNearMascotRef.current = false
    else if (isNearMascot) isPointerNearMascotRef.current = true

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      mascot.style.setProperty('translate', '0px 0px')
      face.style.transform = ''
      return
    }

    if (distance < 220 && distance > 0) {
      const directionX = deltaX / distance
      const directionY = deltaY / distance
      const offset = distance < 80 ? -34 : Math.min(28, (distance - 80) * 0.2)
      mascot.style.setProperty(
        'translate',
        `${directionX * offset}px ${directionY * offset}px`,
      )
      face.style.transform = `translate(${directionX * 3}px, ${directionY * 3}px)`
      return
    }

    mascot.style.setProperty('translate', '0px 0px')
    face.style.transform = ''
  }

  function handleSidePointerLeave() {
    isPointerNearMascotRef.current = false
    mascotRef.current?.style.setProperty('translate', '0px 0px')
    if (mascotFaceRef.current) mascotFaceRef.current.style.transform = ''
  }

  function handleMascotFocus() {
    showMascotSpeech('마우스로 놀아봐요!')
  }

  function handleMascotClick() {
    showMascotSpeech('잘했어요! 데이터 충전 완료')
    setIsMascotHappy(true)
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand">
          <span className="auth-brand-mark" aria-hidden="true" />
          <span>STATIC</span>
        </div>

        <div className="auth-heading">
          <p className="auth-eyebrow">YOUR PERSONAL WORKSPACE</p>
          <h1 id="auth-title">
            {mode === 'login' ? '다시 만나서 반가워요.' : 'STATIC 시작하기'}
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
            ./login
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={mode === 'signup' ? 'is-active' : ''}
            onClick={() => switchMode('signup')}
          >
            ./register
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <label>
              이름
              <span className="auth-input-wrap">
                <input
                  autoComplete="name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="이름 또는 닉네임"
                  maxLength={40}
                />
              </span>
            </label>
          )}

          <label>
            이메일
            <span className="auth-input-wrap">
              <input
                type="email"
                autoComplete="email"
                ref={emailInputRef}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                required
              />
            </span>
          </label>

          <label>
            비밀번호
            <span className="auth-input-wrap">
              <input
                type="password"
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="8자 이상 입력"
                minLength={8}
                required
              />
            </span>
          </label>

          {errorMessage && (
            <p className="auth-alert is-error" role="alert">
              {errorMessage}
            </p>
          )}
          {message && (
            <p className="auth-alert is-success" role="status">
              {message}
            </p>
          )}

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
      <aside
        className="auth-side"
        aria-label="STATIC 소개"
        onPointerMove={handleSidePointerMove}
        onPointerLeave={handleSidePointerLeave}
      >
        <div className="auth-side-pattern" aria-hidden="true" />
        <button
          ref={mascotRef}
          className={`auth-mascot${isMascotHappy ? ' is-happy' : ''}${isMascotSpeaking ? ' is-speaking' : ''}`}
          type="button"
          onClick={handleMascotClick}
          onFocus={handleMascotFocus}
          aria-label="초록 슬라임과 인사하기"
        >
          <span className="auth-mascot-ribbon" aria-hidden="true">
            <span />
          </span>
          <span className="auth-mascot-body" aria-hidden="true" />
          <span className="auth-mascot-face" ref={mascotFaceRef} aria-hidden="true">
            <span className="auth-mascot-blush" />
            <span className="auth-mascot-eye" />
            <span className="auth-mascot-eye" />
            <span className="auth-mascot-blush" />
            <span className="auth-mascot-mouth" />
          </span>
          <span className="auth-mascot-tag" aria-hidden="true">
            heart_blob.exe
          </span>
          <span className="auth-mascot-speech" aria-live="polite">
            {mascotMessage}
          </span>
        </button>

        <div className="auth-side-header">
          <span>
            <i aria-hidden="true" /> WELCOME
          </span>
          <span className="auth-side-badge">// MY DESK</span>
        </div>

        <div className="auth-side-content">
          <p>
            노트, 일정, 프로젝트와 나만의 AI 도구를
            <br />
            한곳에서 관리하세요.
            <span className="auth-cursor" aria-hidden="true">
              _
            </span>
          </p>
          <span className="auth-side-kicker">// DATA BLOB DETECTED</span>
          <div className="auth-side-pills">
            <span>[ NOTES ]</span>
            <span>[ PLANNER ]</span>
            <span>[ AI LIBRARY ]</span>
          </div>
        </div>

        <div className="auth-terminal">
          <form
            onSubmit={handleTerminalSubmit}
            className="auth-terminal-form"
          >
            <label htmlFor="auth-terminal-input">guest@static:~$</label>
            <input
              id="auth-terminal-input"
              value={terminalInput}
              onChange={(event) => setTerminalInput(event.target.value)}
              placeholder="help 또는 blob 입력..."
              autoComplete="off"
              aria-label="STATIC 미니 터미널 명령"
            />
          </form>
          <p className="auth-terminal-output" role="status" aria-live="polite">
            {terminalOutput}
          </p>
        </div>

        <div className="auth-side-bottom">
          <span><i aria-hidden="true" /> SYSTEM ONLINE</span>
          <span>MY DESK · YOUR SPACE</span>
        </div>
      </aside>
    </main>
  )
}
