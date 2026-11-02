import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'

const weddingDate = new Date('2026-12-20T08:00:00+07:00')
const weddingVenue = 'Cafe D’Carlos'
const weddingAddress = 'Jl. Bau Massepe No. 175, Kampung Baru, Kecamatan Bacukiki Barat, Kota Parepare, Sulawesi Selatan 91121'
const mapUrl = 'https://www.google.com/maps/dir/?api=1&destination=-4.020083420573997%2C119.62346972150353'
const appleMapsUrl = 'https://maps.apple.com/?daddr=-4.020083420573997%2C119.62346972150353&dirflg=d'
const mapEmbedUrl = 'https://maps.google.com/maps?q=-4.020083420573997%2C119.62346972150353&z=16&output=embed'
const floatingFlowers = ['✿', '❀', '✧', '✾', '❁', '✦', '✿', '❀', '✧', '✾', '❁', '✦']
const greetingsStorageKey = 'wedding-greetings'
const webAppUrl = 'https://script.google.com/macros/s/AKfycbzDnyjB-Ob8tP_4CoFhHEPu11opRir56ZQPUt6LaL-UkqwfGEEgahMdnfIIm4OFYbtj/exec'
let greetingsRequestId = 0
const weddingDateParts = new Intl.DateTimeFormat('id-ID', {
  month: 'long',
  year: 'numeric',
}).formatToParts(weddingDate)
const weddingDateLabel = (day) => `${day} ${weddingDateParts.find((part) => part.type === 'month').value} ${weddingDateParts.find((part) => part.type === 'year').value}`

async function postToSpreadsheet(payload) {
  const response = await fetch(webAppUrl, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify(payload),
  })

  return { verified: response.type !== 'opaque' }
}

function fetchSharedGreetings() {
  return new Promise((resolve, reject) => {
    const callbackName = `__weddingGreetings${Date.now()}${greetingsRequestId++}`
    const script = document.createElement('script')
    const url = new URL(webAppUrl)
    let settled = false

    const cleanup = () => {
      window.clearTimeout(timeout)
      script.remove()
      delete window[callbackName]
    }

    const finish = (callback, value) => {
      if (settled) return
      settled = true
      cleanup()
      callback(value)
    }

    const timeout = window.setTimeout(() => {
      finish(reject, new Error('Waktu tunggu habis. Periksa deployment Apps Script dan koneksi internet.'))
    }, 15000)

    window[callbackName] = (result) => {
      const entries = result?.greetings ?? result?.data
      if (result?.status !== 'success' || !Array.isArray(entries)) {
        finish(reject, new Error(result?.message || 'Respons daftar ucapan dari Apps Script tidak valid.'))
        return
      }

      const greetings = entries.map((greeting) => ({
        id: String(greeting.id || ''),
        name: String(greeting.name || greeting.nama_pengirim || ''),
        message: String(greeting.message || greeting.pesan || ''),
        createdAt: String(greeting.createdAt || greeting.waktu_kirim || ''),
      }))
      const hasInvalidGreeting = greetings.some((greeting) => (
        !greeting.id
        || !greeting.name
        || !greeting.message
        || !Number.isFinite(Date.parse(greeting.createdAt))
      ))

      if (hasInvalidGreeting) {
        finish(reject, new Error('Format data ucapan pada spreadsheet tidak valid.'))
        return
      }

      finish(resolve, greetings)
    }

    script.async = true
    script.onerror = () => finish(reject, new Error('Daftar ucapan tidak dapat dimuat dari Apps Script.'))
    url.searchParams.set('action', 'getGreetings')
    url.searchParams.set('callback', callbackName)
    url.searchParams.set('_', String(Date.now()))
    script.src = url.toString()
    document.head.append(script)
  })
}

function loadGreetings() {
  try {
    const storedGreetings = window.localStorage.getItem(greetingsStorageKey)
    if (!storedGreetings) return { greetings: [], error: '' }

    const greetings = JSON.parse(storedGreetings)
    if (!Array.isArray(greetings) || greetings.some((greeting) => (
      typeof greeting.id !== 'string'
      || typeof greeting.name !== 'string'
      || typeof greeting.message !== 'string'
      || typeof greeting.createdAt !== 'string'
    ))) {
      throw new Error('Format ucapan tidak valid.')
    }

    return { greetings, error: '' }
  } catch {
    return {
      greetings: [],
      error: 'Ucapan belum dapat dimuat dari penyimpanan browser ini.',
    }
  }
}

function getTimeLeft() {
  const difference = Math.max(0, weddingDate.getTime() - Date.now())

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  }
}

function SulapaMark({ className = '' }) {
  return (
    <span className={`sulapa-mark ${className}`} aria-hidden="true">
      <i /><i /><i /><i /><i />
    </span>
  )
}

function EventDate() {
  const [day, setDay] = useState(() => (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? weddingDate.getDate() : 1
  ))
  const dateRef = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    let animationFrame
    let startTime
    let previousDay = 1
    const duration = 3000
    const startCount = () => {
      const animate = (timestamp) => {
        if (startTime === undefined) startTime = timestamp
        const progress = Math.min((timestamp - startTime) / duration, 1)
        const easedProgress = progress < 0.5
          ? 4 * progress ** 3
          : 1 - ((-2 * progress + 2) ** 3) / 2
        const nextDay = Math.min(
          weddingDate.getDate(),
          1 + Math.floor(easedProgress * (weddingDate.getDate() - 1)),
        )

        if (nextDay !== previousDay) {
          previousDay = nextDay
          setDay(nextDay)
        }

        if (progress < 1) animationFrame = window.requestAnimationFrame(animate)
      }

      animationFrame = window.requestAnimationFrame(animate)
    }

    if (!('IntersectionObserver' in window)) {
      startCount()
      return () => window.cancelAnimationFrame(animationFrame)
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        observer.disconnect()
        startCount()
      }
    }, { threshold: 0.4 })

    if (dateRef.current) observer.observe(dateRef.current)
    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(animationFrame)
    }
  }, [])

  return (
    <div className="event-day-date" ref={dateRef}>
      <span className="event-date-weekday">MINGGU</span>
      <time className="event-date-counter" dateTime={weddingDate.toISOString()}>
        <span className="event-date-day" key={day}>{String(day).padStart(2, '0')}</span>
        <span className="event-date-month">
          {weddingDateParts.find((part) => part.type === 'month').value}
          <strong>{weddingDateParts.find((part) => part.type === 'year').value}</strong>
        </span>
      </time>
    </div>
  )
}

function App() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft)
  const [dateDay, setDateDay] = useState(() => (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? weddingDate.getDate() : 1
  ))
  const [storedGreetings, setStoredGreetings] = useState(() => ({
    ...loadGreetings(),
    loading: false,
  }))
  const [invitedGuestName] = useState(() => (
    new URLSearchParams(window.location.search).get('to')?.trim().slice(0, 80) || ''
  ))
  const [attendance, setAttendance] = useState('hadir')
  const [confirmation, setConfirmation] = useState(null)
  const [copiedAccount, setCopiedAccount] = useState('')
  const [copyMessage, setCopyMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmittingRsvp, setIsSubmittingRsvp] = useState(false)
  const [greetingError, setGreetingError] = useState('')
  const [isSubmittingGreeting, setIsSubmittingGreeting] = useState(false)
  const [greetingModal, setGreetingModal] = useState('')
  const [openedGreetingId, setOpenedGreetingId] = useState('')
  const [theme, setTheme] = useState('light')
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [musicMessage, setMusicMessage] = useState('')
  const [invitationOpened, setInvitationOpened] = useState(false)
  const [invitationOpening, setInvitationOpening] = useState(false)
  const [touchEffects, setTouchEffects] = useState([])
  const musicRef = useRef(null)
  const openingTimerRef = useRef(null)
  const touchTimersRef = useRef(new Set())
  const greetingModalRef = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    let currentDay = 1
    const timer = window.setInterval(() => {
      currentDay += 1
      setDateDay(currentDay)
      if (currentDay >= weddingDate.getDate()) window.clearInterval(timer)
    }, 75)

    return () => window.clearInterval(timer)
  }, [])

  const refreshGreetings = useCallback(async () => {
    setStoredGreetings((current) => ({ ...current, loading: true, error: '' }))
    try {
      const greetings = await fetchSharedGreetings()
      setStoredGreetings({ greetings, error: '', loading: false })
    } catch (error) {
      setStoredGreetings((current) => ({
        ...current,
        error: error instanceof Error ? error.message : 'Ucapan bersama tidak dapat dimuat.',
        loading: false,
      }))
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setTimeLeft(getTimeLeft()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => () => {
    if (openingTimerRef.current) window.clearTimeout(openingTimerRef.current)
    touchTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    musicRef.current?.pause()
  }, [])

  useEffect(() => {
    if (invitationOpened) {
      document.body.style.overflow = ''
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [invitationOpened])

  useEffect(() => {
    if (!greetingModal) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    greetingModalRef.current?.focus()

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setGreetingModal('')
    }
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [greetingModal])

  useEffect(() => {
    if (invitationOpened) void refreshGreetings()
  }, [invitationOpened, refreshGreetings])

  useEffect(() => {
    if (!invitationOpened) return undefined

    const revealElements = document.querySelectorAll('.reveal')

    if (!('IntersectionObserver' in window)) {
      revealElements.forEach((element) => element.classList.add('is-visible'))
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.14, rootMargin: '0px 0px -32px 0px' },
    )

    revealElements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [invitationOpened])

  const registerGuest = async (event) => {
    event.preventDefault()
    if (isSubmittingRsvp) return

    const form = event.currentTarget
    const formData = new FormData(form)
    const guest = {
      name: formData.get('guestName').trim(),
      guests: attendance === 'hadir' ? formData.get('guestCount') : '0',
      attendance,
    }

    setIsSubmittingRsvp(true)
    setFormError('')
    try {
      const delivery = await postToSpreadsheet({
        action: 'rsvp',
        nama: guest.name,
        kehadiran: guest.attendance,
        jumlahTamu: Number.parseInt(guest.guests, 10),
      })
      setConfirmation({ ...guest, spreadsheetVerified: delivery.verified })
      form.reset()
      setAttendance('hadir')
      setGreetingError('')
      setGreetingModal('rsvp-success')
    } catch (error) {
      setFormError(`Konfirmasi belum berhasil dikirim. Periksa koneksi internet dan URL/deployment Apps Script, lalu coba lagi.${error instanceof Error ? ` (${error.message})` : ''}`)
    } finally {
      setIsSubmittingRsvp(false)
    }
  }

  const submitGreeting = async (event) => {
    event.preventDefault()
    if (isSubmittingGreeting) return

    const formData = new FormData(event.currentTarget)
    const randomBytes = new Uint8Array(8)
    window.crypto.getRandomValues(randomBytes)
    const id = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
    const greeting = {
      id,
      name: formData.get('greetingName').trim(),
      message: formData.get('greetingMessage').trim(),
      createdAt: new Date().toISOString(),
    }

    setIsSubmittingGreeting(true)
    setGreetingError('')
    try {
      await postToSpreadsheet({
        action: 'greeting',
        namaPengirim: greeting.name,
        pesan: greeting.message,
      })

      const nextGreetings = [greeting, ...storedGreetings.greetings]
      setStoredGreetings({ greetings: nextGreetings, error: '', loading: false })
      try {
        window.localStorage.setItem(greetingsStorageKey, JSON.stringify(nextGreetings))
      } catch {
        setGreetingError('Permintaan sudah dikirim, tetapi surat tidak dapat disimpan sebagai salinan di perangkat ini.')
      }

      setOpenedGreetingId('')
      setGreetingModal('list')
      void refreshGreetings()
    } catch (error) {
      setGreetingError(`Ucapan belum berhasil dikirim. Periksa koneksi internet dan URL/deployment Apps Script, lalu coba lagi.${error instanceof Error ? ` (${error.message})` : ''}`)
    } finally {
      setIsSubmittingGreeting(false)
    }
  }

  const openGreetingComposer = () => {
    setGreetingError('')
    setGreetingModal('compose')
  }

  const closeGreetingModal = () => {
    setGreetingModal('')
    setGreetingError('')
  }

  const copyAccount = async (account) => {
    try {
      await navigator.clipboard.writeText(account)
      setCopiedAccount(account)
      setCopyMessage('Nomor rekening berhasil disalin.')
      window.setTimeout(() => setCopiedAccount(''), 2000)
    } catch {
      setCopiedAccount('')
      setCopyMessage('Nomor tidak dapat disalin. Silakan salin nomor rekening secara manual.')
    }
  }

  const openInvitation = () => {
    if (invitationOpening || invitationOpened) return
    void startMusic()

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setInvitationOpened(true)
      return
    }

    setInvitationOpening(true)
    openingTimerRef.current = window.setTimeout(() => {
      setInvitationOpened(true)
      setInvitationOpening(false)
      openingTimerRef.current = null
    }, 1100)
  }

  const startMusic = async () => {
    setMusicMessage('')

    try {
      const player = musicRef.current
      if (!player) throw new Error('Pemutar musik belum siap.')

      await player.play()
      setMusicPlaying(true)
      setMusicMessage('Musik sedang diputar.')
    } catch (error) {
      setMusicPlaying(false)
      setMusicMessage(error instanceof Error && error.name === 'NotSupportedError'
        ? 'Format file musik ini tidak didukung browser.'
        : 'Musik tidak dapat diputar. Tekan tombol musik untuk mencoba lagi.')
    }
  }

  const createTouchEffect = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (event.target.closest('.invitation-opening, input, textarea, select, iframe')) return

    const id = `${Date.now()}-${Math.random()}`
    const effect = { id, x: event.clientX, y: event.clientY }
    setTouchEffects((currentEffects) => [...currentEffects.slice(-5), effect])
    const timer = window.setTimeout(() => {
      setTouchEffects((currentEffects) => currentEffects.filter((item) => item.id !== id))
      touchTimersRef.current.delete(timer)
    }, 1000)
    touchTimersRef.current.add(timer)
  }

  const toggleMusic = async () => {
    setMusicMessage('')

    const player = musicRef.current
    if (!player) {
      setMusicMessage('Pemutar musik belum siap.')
      return
    }

    if (musicPlaying) {
      player.pause()
      setMusicPlaying(false)
      setMusicMessage('Musik dijeda.')
      return
    }

    await startMusic()
  }

  return (
    <>
      {!invitationOpened && (
        <div
          className={`invitation-opening ${invitationOpening ? 'is-opening' : ''}`}
          data-theme={theme}
          role="dialog"
          aria-modal="true"
          aria-labelledby="opening-title"
        >
          <div className="opening-stars" aria-hidden="true">✦ ✧ ❀ ✧ ✦</div>
          <div className="sulapa-lockup opening-sulapa">
            <SulapaMark />
          </div>
          <h1 id="opening-title" className="opening-names">Irna <span>&</span> Peby</h1>
          <p className="opening-date">
            <span className="date-counter">{String(dateDay).padStart(2, '0')}</span>
            {' '}{weddingDateLabel(dateDay).replace(/^\d+\s/, '')} <span>·</span> Parepare
          </p>
          <div className="opening-recipient">
            <span>{invitedGuestName ? 'KEPADA YTH.' : 'TAMU UNDANGAN'}</span>
            <strong>{invitedGuestName || 'Bapak/Ibu/Saudara/i'}</strong>
          </div>
          <div className="opening-envelope">
            <div className="envelope-back" />
            <div className="opening-letter">
              <span className="letter-monogram">I<span>&</span>P</span>
              <span className="letter-rule" />
              <span className="letter-caption">DENGAN PENUH CINTA</span>
            </div>
            <div className="envelope-flap" />
            <div className="envelope-front" />
            <button className="opening-seal" type="button" onClick={openInvitation} autoFocus>
              <span aria-hidden="true">I&P</span>
              <span className="sr-only">Buka undangan pernikahan</span>
            </button>
          </div>
          <p className="opening-instruction">Sentuh segel untuk membuka undangan</p>
          <button className="opening-text-button" type="button" onClick={openInvitation}>Buka undangan <span><i className="bi bi-arrow-up-right" aria-hidden="true" /></span></button>
        </div>
      )}
      <main
        className={invitationOpened ? 'invitation-is-open' : 'invitation-is-closed'}
        data-theme={theme}
        inert={!invitationOpened}
        onPointerDown={createTouchEffect}
      >
      <audio ref={musicRef} src="/Nada%20Serumpun%20(feat.%20Yoga%20Kharisma%20Putra).mp3" loop preload="none" />
      <div className="global-flower-layer" aria-hidden="true">
        {floatingFlowers.map((flower, index) => (
          <span className="global-flower" key={`${flower}-${index}`}>{flower}</span>
        ))}
      </div>
      {touchEffects.map((effect) => (
        <span
          className="touch-burst"
          key={effect.id}
          aria-hidden="true"
          style={{ left: effect.x, top: effect.y }}
        >
          <span>✧</span><span>✿</span><span>✦</span><span>❀</span><span>·</span>
        </span>
      ))}
      <header className="site-header">
        <a className="brand" href="#home" aria-label="Irna dan Peby, halaman utama">
          I<span>&</span>P
        </a>
        <nav aria-label="Navigasi utama">
          <a href="#cerita">Cerita</a>
          <a href="#acara">Acara</a>
          <a href="#lokasi">Lokasi</a>
          <a href="#hadiah">Hadiah</a>
          <a className="nav-rsvp" href="#rsvp">Konfirmasi hadir <span><i className="bi bi-arrow-up-right" aria-hidden="true" /></span></a>
        </nav>
        <div className="header-actions">
          <button
            className="icon-button"
            type="button"
            onClick={() => setTheme((currentTheme) => currentTheme === 'light' ? 'dark' : 'light')}
            aria-label={`Aktifkan tema ${theme === 'light' ? 'gelap' : 'terang'}`}
            aria-pressed={theme === 'dark'}
            title={`Aktifkan tema ${theme === 'light' ? 'gelap' : 'terang'}`}
          >
            <i className={`bi ${theme === 'light' ? 'bi-moon-stars' : 'bi-sun'}`} aria-hidden="true" />
          </button>
          <button
            className={`icon-button music-button ${musicPlaying ? 'is-playing' : ''}`}
            type="button"
            onClick={toggleMusic}
            aria-label={musicPlaying ? 'Jeda musik' : 'Putar musik'}
            aria-pressed={musicPlaying}
            title={musicPlaying ? 'Jeda musik' : 'Putar musik'}
          >
            <i className={`bi ${musicPlaying ? 'bi-pause-fill' : 'bi-music-note-beamed'}`} aria-hidden="true" />
          </button>
          {musicMessage && <span className="header-status" role="status">{musicMessage}</span>}
        </div>
      </header>

      <section className="hero" id="home">
        <div className="hero-photo" aria-hidden="true" />
        <img className="hero-flower hero-flower-left" src="/flower.png" alt="" aria-hidden="true" />
        <img className="hero-flower hero-flower-right" src="/flower.png" alt="" aria-hidden="true" />
        <div className="bugis-hero-trim bugis-hero-trim-top" aria-hidden="true" />
        <div className="bugis-hero-trim bugis-hero-trim-bottom" aria-hidden="true" />
        <div className="hero-content">
          <div className="sulapa-lockup hero-sulapa">
            <SulapaMark />
          </div>
          <p className="eyebrow hero-eyebrow">INTIMATE WEDDING</p>
          <h1>Irna <span>&</span> Peby</h1>
          <p className="hero-date">
            <span className="date-counter">{String(dateDay).padStart(2, '0')}</span>
            {' '}{weddingDateLabel(dateDay).replace(/^\d+\s/, '')} <span className="date-dot">·</span> Parepare
          </p>
          <a className="button button-light" href="#cerita">Lihat cerita kami <span>↓</span></a>
        </div>
        <p className="hero-caption">SEBUAH HARI, SEBUAH JANJI, SELAMANYA.</p>
        <span className="hero-index">01 — 05</span>
      </section>

      <section className="intro section-wrap" id="cerita">
        <div className="intro-copy reveal">
          <div className="bugis-card-frame" aria-hidden="true" />
          <div className="sulapa-lockup intro-sulapa">
            <SulapaMark />
          </div>
          <div className="section-label"><span>01</span> DENGAN PENUH SUKACITA</div>
          <div className="intro-invitation">
            <h2>Dua hati, satu<br /><em>perjalanan.</em></h2>
            <span className="intro-rule" aria-hidden="true"><i /></span>
            <p className="body-copy">
              Dengan penuh rasa syukur, kami mengundang Anda untuk menjadi bagian dari
              hari istimewa kami. <strong>Kehadiran dan doa restu Anda</strong> akan menjadi
              kebahagiaan yang tak ternilai.
            </p>
          </div>
          <div className="couple-introduction">
            <span className="couple-flower couple-flower-left" aria-hidden="true">❀</span>
            <p className="couple-names">Irna <span>&</span> Peby</p>
            <div className="couple-full-names">
              <p className="couple-person">
                <span>MEMPELAI WANITA</span>
                <strong>Irna Sri Rezky Irwan</strong>
                <small>Putri dari Bapak Irwan Samudi<br />dan Ibu Andi Asrianti</small>
              </p>
              <span className="couple-divider" aria-hidden="true">✦</span>
              <p className="couple-person">
                <span>MEMPELAI PRIA</span>
                <strong>Peby Nugraha Ariyanto</strong>
                <small>Putra dari (Alm.) Oesny El<br />dan Hj. Nirwana</small>
              </p>
            </div>
            <span className="couple-flower couple-flower-right" aria-hidden="true">✿</span>
          </div>
          <div className="intro-aside">
            <span className="ornament" aria-hidden="true">❋</span>
            <p className="prayer-label">DOA PEMBUKA</p>
            <blockquote>
              Dan Di Antara Tanda-Tanda (Kebesaran)-Nya Ialah Dia Menciptakan Pasangan-Pasangan Untukmu Dari Jenismu Sendiri, Agar Kamu <strong>Cenderung Dan Merasa Tenteram Kepadanya</strong>, Dan Dia Menjadikan Di Antaramu <strong>Rasa Kasih Dan Sayang</strong>. Sungguh, Pada Yang Demikian Itu Benar-Benar Terdapat Tanda-Tanda (Kebesaran Allah) Bagi Kaum Yang Berpikir.
            </blockquote>
            <span className="verse">- QS. Ar-Rum : 21 -</span>
          </div>
        </div>
      </section>

      <section className="countdown-section reveal" aria-label="Hitung mundur menuju hari pernikahan">
        <div className="countdown-inner">
          <p className="eyebrow">MENUJU HARI BAHAGIA</p>
          <h2>Sampai jumpa di hari istimewa</h2>
          <div className="countdown">
            {Object.entries(timeLeft).map(([unit, value]) => (
              <div className="countdown-item" key={unit}>
                <span className="countdown-number">{String(value).padStart(2, '0')}</span>
                <span className="countdown-label">{unit === 'days' ? 'hari' : unit === 'hours' ? 'jam' : unit === 'minutes' ? 'menit' : 'detik'}</span>
              </div>
            ))}
          </div>
          <p className="countdown-date">{weddingDateLabel(dateDay)}</p>
        </div>
      </section>

      <section className="events section-wrap" id="acara">
        <img className="section-ornament events-ornament" src="/flower%202.png" alt="" aria-hidden="true" />
        <div className="section-label reveal"><span>02</span> RANGKAIAN ACARA</div>
        <div className="events-heading reveal">
          <p className="eyebrow">CATAT TANGGALNYA</p>
          <h2>Hari yang kami<br /><em>nantikan.</em></h2>
        </div>
        <div className="event-cards">
          <article className="event-card reveal">
            <p className="event-number">01 / AKAD</p>
            <h3>Akad Nikah</h3>
            <EventDate />
            <p className="event-time"><strong>10.00 WITA</strong> – selesai</p>
            <div className="event-divider" />
            <p className="event-venue"><i className="bi bi-geo-alt-fill" aria-hidden="true" /><strong>{weddingVenue}</strong></p>
            <p className="event-place">{weddingAddress}</p>
            <div className="event-map-links">
              <a className="text-link" href={mapUrl} target="_blank" rel="noreferrer">Google Maps <i className="bi bi-arrow-up-right" aria-hidden="true" /></a>
              <a className="text-link" href={appleMapsUrl} target="_blank" rel="noreferrer">Apple Maps <i className="bi bi-arrow-up-right" aria-hidden="true" /></a>
            </div>
          </article>
          <article className="event-card event-card-dark reveal">
            <p className="event-number">02 / RESEPSI</p>
            <h3>Resepsi</h3>
            <EventDate />
            <p className="event-time"><strong>11.00 WITA</strong> – selesai</p>
            <div className="event-divider" />
            <p className="event-venue"><i className="bi bi-geo-alt-fill" aria-hidden="true" /><strong>{weddingVenue}</strong></p>
            <p className="event-place">{weddingAddress}</p>
            <div className="event-map-links">
              <a className="text-link" href={mapUrl} target="_blank" rel="noreferrer">Google Maps <i className="bi bi-arrow-up-right" aria-hidden="true" /></a>
              <a className="text-link" href={appleMapsUrl} target="_blank" rel="noreferrer">Apple Maps <i className="bi bi-arrow-up-right" aria-hidden="true" /></a>
            </div>
          </article>
        </div>
      </section>

      <section className="location-section section-wrap" id="lokasi">
        <img className="section-ornament location-ornament" src="/flower%203.png" alt="" aria-hidden="true" />
        <div className="section-label reveal"><span>03</span> LOKASI ACARA</div>
        <div className="location-content">
          <div className="location-copy location-paper reveal">
            <p className="eyebrow">SAMPAI JUMPA DI PAREPARE</p>
            <h2>Temukan<br /><em>jalan menuju kami.</em></h2>
            <p className="location-venue"><strong>Akad nikah dan resepsi</strong></p>
            <p className="location-venue-name"><i className="bi bi-geo-alt-fill" aria-hidden="true" /> {weddingVenue}</p>
            <address>{weddingAddress}</address>
            <div className="location-map-actions">
              <a className="button button-dark location-button" href={mapUrl} target="_blank" rel="noreferrer">
                <i className="bi bi-geo-alt" aria-hidden="true" /> Google Maps <i className="bi bi-arrow-up-right" aria-hidden="true" />
              </a>
              <a className="button button-dark location-button apple-maps-button" href={appleMapsUrl} target="_blank" rel="noreferrer">
                <i className="bi bi-apple" aria-hidden="true" /> Apple Maps <i className="bi bi-arrow-up-right" aria-hidden="true" />
              </a>
            </div>
          </div>
          <div className="location-map reveal">
            <iframe
              title="Peta lokasi acara pernikahan Irna dan Peby"
              src={mapEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <a className="map-overlay-link" href={mapUrl} target="_blank" rel="noreferrer">
              Buka Google Maps <span><i className="bi bi-arrow-up-right" aria-hidden="true" /></span>
            </a>
          </div>
        </div>
      </section>

      <section className="rsvp-section" id="rsvp">
        <div className="rsvp-decoration" aria-hidden="true">❋</div>
        <img className="section-flower section-flower-one" src="/flower.png" alt="" aria-hidden="true" />
        <img className="section-flower section-flower-two" src="/flower.png" alt="" aria-hidden="true" />
        <div className="rsvp-content">
          <div className="section-label reveal"><span>04</span> KONFIRMASI KEHADIRAN</div>
          <div className="rsvp-intro reveal">
            <p className="eyebrow">KAMI MENUNGGU KABAR BAIK DARIMU</p>
            <h2>Bisakah Anda<br /><em>bergabung?</em></h2>
            <p className="rsvp-description">Mohon konfirmasi kehadiran Anda melalui formulir berikut.</p>
          </div>

          <div className="rsvp-interaction reveal">
            {confirmation && (
              <p className="rsvp-confirmation" role="status">
                Terima kasih, <strong>{confirmation.name}</strong>. Konfirmasi Anda{' '}
                {confirmation.attendance === 'hadir' ? 'untuk hadir' : 'tidak hadir'} sudah dikirim.
              </p>
            )}

            <form className="rsvp-form" onSubmit={registerGuest}>
              <label className="field-label" htmlFor="guestName">Nama lengkap</label>
              <input
                id="guestName"
                name="guestName"
                type="text"
                defaultValue={invitedGuestName}
                placeholder="Tulis nama Anda"
                autoComplete="name"
                required
                maxLength={80}
              />
              <fieldset className="attendance-field">
                <legend className="field-label">Konfirmasi kehadiran</legend>
                <label className={`attendance-option ${attendance === 'hadir' ? 'selected' : ''}`}>
                  <input type="radio" name="attendance" value="hadir" checked={attendance === 'hadir'} onChange={() => setAttendance('hadir')} />
                  <span>Dengan senang hati hadir</span>
                </label>
                <label className={`attendance-option ${attendance === 'tidak-hadir' ? 'selected' : ''}`}>
                  <input type="radio" name="attendance" value="tidak-hadir" checked={attendance === 'tidak-hadir'} onChange={() => setAttendance('tidak-hadir')} />
                  <span>Maaf, belum bisa hadir</span>
                </label>
              </fieldset>
              {attendance === 'hadir' && (
                <label className="field-label guest-count-label" htmlFor="guestCount">
                  Jumlah tamu
                  <select id="guestCount" name="guestCount" defaultValue="1">
                    <option value="1">1 orang</option>
                    <option value="2">2 orang</option>
                    <option value="3">3 orang</option>
                    <option value="4">4 orang</option>
                  </select>
                </label>
              )}
              {formError && <p className="form-error" role="alert">{formError}</p>}
              <button className="button button-dark" type="submit" disabled={isSubmittingRsvp}>
                {isSubmittingRsvp ? 'Mengirim...' : 'Kirim konfirmasi'} <span><i className="bi bi-arrow-up-right" aria-hidden="true" /></span>
              </button>
              <p className="form-note">Konfirmasi dikirim ke spreadsheet.</p>
            </form>
            <button className="greeting-invite-button" type="button" onClick={openGreetingComposer}>
              <i className="bi bi-envelope-heart" aria-hidden="true" /> Bagikan ucapan
            </button>
          </div>
        </div>
      </section>

      <section className="gift-section section-wrap" id="hadiah">
        <img className="gift-flower" src="/flower.png" alt="" aria-hidden="true" />
        <div className="section-label reveal"><span>05</span> TANDA KASIH</div>
        <div className="gift-copy reveal">
          <p className="eyebrow">DOA ANDA ADALAH HADIAH TERINDAH</p>
          <h2>Namun jika ingin<br />berbagi <em>kebahagiaan.</em></h2>
          <p className="body-copy">Kehadiran Anda sudah menjadi hadiah terbaik. Bagi yang berhalangan hadir dan ingin mengirim tanda kasih, dapat melalui rekening berikut.</p>
          <div className="bank-card">
            <div className="bank-top"><span className="bank-name">BCA</span><span className="bank-chip">TRANSFER</span></div>
            <p className="account-number"><strong>846 0475733</strong></p>
            <div className="account-bottom">
              <span>ATAS NAMA<br /><strong>IRNA SRI REZKY IRWAN</strong></span>
              <button className="copy-button" type="button" onClick={() => copyAccount('8460475733')}>
                <i className={`bi ${copiedAccount === '8460475733' ? 'bi-check2' : 'bi-copy'}`} aria-hidden="true" />
                {copiedAccount === '8460475733' ? 'Tersalin' : 'Salin nomor'}
              </button>
            </div>
          </div>
          {copyMessage && <p className="copy-message" role="status">{copyMessage}</p>}
        </div>
        <div className="gift-aside reveal">
          <span className="gift-mark" aria-hidden="true">✳</span>
          <p>Dengan cinta,<br /><em>Irna & Peby</em></p>
        </div>
      </section>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#home">I<span>&</span>P</a>
        <div className="footer-closing">
          <h2>TERIMA KASIH</h2>
          <p>Atas kehadiran dan Doa Restunya kami ucapkan terima kasih.</p>
          <p className="footer-family-intro">Kami Yang Berbahagia,</p>
          <p className="footer-family"><strong>Keluarga Besar Kedua Mempelai</strong></p>
        </div>
        <span>IRNA & PEBY · {new Date().getFullYear()}</span>
      </footer>
    </main>
      {invitationOpened && (
        <div className={`greeting-ui ${theme === 'dark' ? 'is-dark' : ''}`}>
          <button
            className="greeting-dock-button"
            type="button"
            onClick={() => {
              setOpenedGreetingId('')
              setGreetingError('')
              setGreetingModal('list')
              void refreshGreetings()
            }}
            aria-haspopup="dialog"
            aria-label={storedGreetings.loading
              ? 'Buka ucapan, sedang memuat'
              : `Buka ucapan, ${storedGreetings.greetings.length} surat`}
          >
            <i className="bi bi-envelope-heart greeting-dock-icon" aria-hidden="true" />
            <span>Ucapan</span>
            <span className="greeting-count">{storedGreetings.loading ? '…' : storedGreetings.greetings.length}</span>
          </button>

          {greetingModal && (
            <div
              className="greeting-overlay"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) closeGreetingModal()
              }}
            >
              <section
                className="greeting-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="greeting-dialog-title"
                tabIndex="-1"
                ref={greetingModalRef}
              >
                <button className="greeting-close" type="button" onClick={closeGreetingModal} aria-label="Tutup pop-up"><i className="bi bi-x-lg" aria-hidden="true" /></button>
                {greetingModal === 'rsvp-success' ? (
                  <div className="rsvp-thanks">
                    <span className="rsvp-thanks-seal" aria-hidden="true">✦</span>
                    <p className="eyebrow">KABAR BAHAGIA TELAH KAMI TERIMA</p>
                    <h2 id="greeting-dialog-title">
                      Terima kasih,<br /><em>{confirmation?.name}.</em>
                    </h2>
                    <p className="greeting-dialog-intro">
                      Konfirmasi Anda {confirmation?.attendance === 'hadir' ? 'untuk hadir' : 'tidak hadir'} sudah kami terima.
                      {confirmation?.attendance === 'hadir'
                        ? ' Kehadiran Anda akan menjadi kebahagiaan bagi kami.'
                        : ' Doa dan perhatian Anda tetap berarti bagi kami.'}
                    </p>
                    <p className="rsvp-thanks-prompt">Berkenan menitipkan doa dan ucapan untuk kami?</p>
                    <button
                      className="button button-dark"
                      type="button"
                      onClick={() => {
                        setGreetingError('')
                        setGreetingModal('compose')
                      }}
                    >
                      <i className="bi bi-envelope-heart" aria-hidden="true" /> <span>Tulis ucapan untuk mempelai</span> <span><i className="bi bi-arrow-up-right" aria-hidden="true" /></span>
                    </button>
                    <button className="rsvp-thanks-dismiss" type="button" onClick={closeGreetingModal}>
                      Nanti saja
                    </button>
                  </div>
                ) : greetingModal === 'compose' ? (
                  <>
                    <p className="eyebrow">SEPOTONG DOA UNTUK KAMI</p>
                    <h2 id="greeting-dialog-title">Kirim <em>ucapan.</em></h2>
                    <p className="greeting-dialog-intro">Tuliskan doa dan pesan hangat untuk Irna & Peby.</p>
                    <form className="greeting-form" onSubmit={submitGreeting}>
                      <label className="field-label" htmlFor="greetingName">Nama Anda</label>
                      <input
                        id="greetingName"
                        name="greetingName"
                        type="text"
                        defaultValue={invitedGuestName || confirmation?.name || ''}
                        placeholder="Tulis nama Anda"
                        autoComplete="name"
                        required
                        maxLength={80}
                      />
                      <label className="field-label" htmlFor="greetingMessage">Ucapan dan doa</label>
                      <textarea
                        id="greetingMessage"
                        name="greetingMessage"
                        placeholder="Tuliskan ucapan terbaik Anda di sini..."
                        required
                        maxLength={1000}
                        rows={5}
                      />
                      {greetingError && <p className="form-error" role="alert">{greetingError}</p>}
                      <button className="button button-dark" type="submit" disabled={isSubmittingGreeting}>
                        {isSubmittingGreeting ? 'Mengirim...' : 'Kirim surat'} <span><i className="bi bi-arrow-up-right" aria-hidden="true" /></span>
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <p className="eyebrow">SURAT PENUH DOA</p>
                    <h2 id="greeting-dialog-title">Ucapan <em>untuk kami.</em></h2>
                    {storedGreetings.loading && <p className="greeting-empty" role="status">Memuat ucapan...</p>}
                    {greetingError && <p className="form-error" role="alert">{greetingError}</p>}
                    {!greetingError && storedGreetings.error && <p className="form-error" role="alert">{storedGreetings.error}</p>}
                    {storedGreetings.error && (
                      <button className="button button-dark" type="button" onClick={() => void refreshGreetings()}>
                        Coba muat ulang
                      </button>
                    )}
                    {!storedGreetings.loading && !storedGreetings.error && storedGreetings.greetings.length === 0 && (
                      <p className="greeting-empty">Belum ada surat ucapan. Jadilah yang pertama mengirimkan doa.</p>
                    )}
                    <div className="greeting-list">
                      {storedGreetings.greetings.map((greeting) => (
                        <article className={`greeting-envelope ${openedGreetingId === greeting.id ? 'is-open' : ''}`} key={greeting.id}>
                          <span className="greeting-seal" aria-hidden="true">I<span>&</span>P</span>
                          <div className="greeting-envelope-copy">
                            <strong>Untuk Irna & Peby</strong>
                            <span>Dari {greeting.name}</span>
                            {openedGreetingId === greeting.id && (
                              <>
                                <p>{greeting.message}</p>
                                <time dateTime={greeting.createdAt}>
                                  {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(greeting.createdAt))}
                                </time>
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            className="greeting-open-button"
                            onClick={() => setOpenedGreetingId((currentId) => currentId === greeting.id ? '' : greeting.id)}
                            aria-expanded={openedGreetingId === greeting.id}
                          >
                            {openedGreetingId === greeting.id ? 'Tutup surat' : 'Buka amplop'}
                          </button>
                        </article>
                      ))}
                    </div>
                    <p className="form-note">Daftar yang tampil berasal dari browser ini. Agar ucapan semua tamu tampil, Apps Script juga perlu menyediakan endpoint untuk membaca data spreadsheet.</p>
                  </>
                )}
              </section>
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default App
