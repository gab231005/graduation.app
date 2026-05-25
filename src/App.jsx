import { Html5QrcodeScanner } from 'html5-qrcode'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib/supabase'

const FLIGHT = 'GD2026'
const ROUTE = 'BKI to FUTURE'
const TIME = '18:00'

const normalizeSeat = (value) => {
  const cleaned = String(value ?? '').replace(/\D/g, '')

  if (!cleaned) {
    return '001'
  }

  return cleaned.slice(-3).padStart(3, '0')
}

const normalizeGuest = (payload) => {
  if (!payload) {
    return null
  }

  const guestClass =
    payload.class?.toLowerCase() ||
    payload.type?.toLowerCase() ||
    payload.role?.toLowerCase() ||
    'economy'

  return {
    id: payload.id ?? payload.participant_id ?? payload.guest_id ?? '',
    name: payload.name ?? '',
    seat: normalizeSeat(payload.seat ?? payload.group_num ?? payload.zone ?? payload.seat_code),
    flight: payload.flight ?? FLIGHT,
    time: payload.time ?? TIME,
    destination: payload.destination ?? ROUTE,
    class: guestClass === 'graduate' || guestClass === 'business' || guestClass === 'vip' ? 'business' : 'economy',
    food_redeemed: payload.food_redeemed ?? false,
  }
}

function App() {
  const [mode, setMode] = useState('onboarding')
  const [message, setMessage] = useState('Scan the participant QR code to begin.')
  const [scanStatus, setScanStatus] = useState('success')
  const [isProcessing, setIsProcessing] = useState(false)
  const [scannedGuest, setScannedGuest] = useState(null)
  const [configWarning, setConfigWarning] = useState('')

  const processingRef = useRef(false)
  const lastScannedRef = useRef('')

  useEffect(() => {
    if (!supabase) {
      setConfigWarning('Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel to activate cloud syncing.')
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      return
    }

    const scanner = new Html5QrcodeScanner(
      'reader',
      { fps: 10, qrbox: { width: 280, height: 280 }, rememberLastUsedCamera: true },
      false
    )

    scanner.render(async (text) => {
      if (processingRef.current) {
        return
      }

      const trimmed = String(text).trim()

      if (!trimmed || trimmed === lastScannedRef.current) {
        return
      }

      lastScannedRef.current = trimmed
      processingRef.current = true
      setIsProcessing(true)
      setMessage('Checking the participant record...')
      setScanStatus('success')

      try {
        const parsed = JSON.parse(trimmed)
        const baseGuest = normalizeGuest(parsed)

        if (!baseGuest?.id) {
          setScanStatus('warning')
          setMessage('❌ Invalid QR code. Please scan a valid participant pass.')
          setScannedGuest(null)
          return
        }

        const { data: guestRecord, error: fetchError } = await supabase
          .from('guests')
          .select('id,name,group_num,type,food_redeemed')
          .eq('id', baseGuest.id)
          .single()

        if (fetchError || !guestRecord) {
          setScanStatus('warning')
          setMessage('❌ Passenger record not found in Supabase.')
          setScannedGuest(null)
          return
        }

        const mergedGuest = {
          ...baseGuest,
          name: guestRecord.name ?? baseGuest.name,
          seat: normalizeSeat(guestRecord.group_num ?? baseGuest.seat),
          class: guestRecord.type === 'graduate' ? 'business' : baseGuest.class,
          food_redeemed: guestRecord.food_redeemed ?? false,
        }

        setScannedGuest(mergedGuest)

        if (mode === 'onboarding') {
          setScanStatus('success')
          setMessage(`✅ Welcome onboard, ${mergedGuest.name}!`)
          return
        }

        if (mergedGuest.food_redeemed) {
          setScanStatus('warning')
          setMessage(`⚠️ ${mergedGuest.name} has already redeemed the food.`)
          return
        }

        const { error: updateError } = await supabase
          .from('guests')
          .update({ food_redeemed: true })
          .eq('id', mergedGuest.id)

        if (updateError) {
          setScanStatus('warning')
          setMessage('❌ Update failed. Please retry the food redemption.')
          return
        }

        setScanStatus('success')
        setMessage(`✅ ${mergedGuest.name} redeemed successfully.`)
      } catch (error) {
        setScanStatus('warning')
        setMessage('❌ QR parse error. Please scan a valid boarding pass.')
        setScannedGuest(null)
      } finally {
        setIsProcessing(false)
        processingRef.current = false
      }
    })

    return () => {
      processingRef.current = false
      scanner.clear().catch(() => {})
    }
  }, [mode])

  const handleModeChange = (nextMode) => {
    setMode(nextMode)
    setScannedGuest(null)
    lastScannedRef.current = ''
    setMessage(
      nextMode === 'onboarding'
        ? 'Scan the participant QR code to welcome them onboard.'
        : 'Scan the participant QR code to redeem the food.'
    )
    setScanStatus('success')
  }

  // UI STYLING CONSTANTS (White & Blue Theme)
  const colors = {
    bg: '#f0f4f8',
    cardBg: '#ffffff',
    primary: '#2563eb',
    primaryLight: '#eff6ff',
    textMain: '#1e293b',
    textMuted: '#64748b',
    border: '#e2e8f0',
    successBg: '#dcfce7',
    successText: '#166534',
    warningBg: '#fee2e2',
    warningText: '#991b1b',
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '32px 24px',
        backgroundColor: colors.bg,
        color: colors.textMain,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <p style={{ margin: '0 0 8px', color: colors.primary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.2px', fontSize: '14px' }}>
            Graduation Ceremony Operations
          </p>
          <h1 style={{ margin: '0 0 12px', fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', color: '#0f172a', fontWeight: 800 }}>
            Boarding Pass & Dashboard
          </h1>
          <p style={{ margin: '0 auto', maxWidth: '600px', color: colors.textMuted, lineHeight: 1.6 }}>
            Validate onboarding and food redemption via QR code, or allow participants to generate their boarding passes.
          </p>
        </div>

        {/* WARNING */}
        {configWarning && (
          <div
            style={{
              marginBottom: '24px',
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: '#fef9c3',
              color: '#854d0e',
              border: '1px solid #fef08a',
              textAlign: 'center',
            }}
          >
            {configWarning}
          </div>
        )}

        {/* MODE TOGGLES */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          {[
            {
              key: 'onboarding',
              title: 'Onboarding Scan',
              description: 'Welcome participants and verify credentials.',
              badge: '✅ Entry',
            },
            {
              key: 'food',
              title: 'Food Redemption',
              description: 'Mark food rewards as claimed.',
              badge: '🍽️ Food',
            },
            {
              key: 'generate',
              title: 'Ticket Generator',
              description: 'Generate boarding passes for participants.',
              badge: '🎫 Tickets',
              isLink: true,
              to: '/generate',
            },
          ].map((panel) => {
            const isActive = mode === panel.key;
            
            const cardStyle = {
              textAlign: 'left',
              padding: '20px',
              borderRadius: '16px',
              border: `2px solid ${isActive ? colors.primary : colors.border}`,
              backgroundColor: isActive ? colors.primaryLight : colors.cardBg,
              color: colors.textMain,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isActive ? '0 4px 12px rgba(37, 99, 235, 0.1)' : 'none',
              textDecoration: 'none',
              display: 'block',
            };

            const cardContent = (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <p style={{ margin: 0, fontWeight: 700, color: isActive ? colors.primary : colors.textMain, fontSize: '18px' }}>
                    {panel.title}
                  </p>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '999px',
                      backgroundColor: isActive ? colors.primary : colors.bg,
                      color: isActive ? '#ffffff' : colors.textMuted,
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {panel.badge}
                  </span>
                </div>
                <p style={{ margin: 0, color: isActive ? '#1e3a8a' : colors.textMuted, fontSize: '14px' }}>
                  {panel.description}
                </p>
              </>
            );

            if (panel.isLink) {
              return (
                <Link
                  key={panel.key}
                  to={panel.to}
                  style={cardStyle}
                >
                  {cardContent}
                </Link>
              );
            }

            return (
              <button
                key={panel.key}
                type="button"
                onClick={() => handleModeChange(panel.key)}
                disabled={isProcessing}
                style={cardStyle}
              >
                {cardContent}
              </button>
            )
          })}
        </div>

        {/* MAIN CONTENT AREA */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
          
          {/* SCANNER SECTION */}
          <section
            style={{
              backgroundColor: colors.cardBg,
              borderRadius: '20px',
              padding: '32px',
              border: `1px solid ${colors.border}`,
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.02)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
                borderBottom: `1px solid ${colors.border}`,
                paddingBottom: '16px',
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>
                  {mode === 'onboarding' ? 'Participant Check-in' : 'Food Redemption Check'}
                </h2>
              </div>
              <span
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  backgroundColor: isProcessing ? '#e0f2fe' : colors.successBg,
                  color: isProcessing ? '#0369a1' : colors.successText,
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                {isProcessing ? 'Processing...' : 'Camera Active'}
              </span>
            </div>

            <div id="reader" style={{ borderRadius: '12px', overflow: 'hidden', border: `1px solid ${colors.border}` }} />

            <div
              style={{
                marginTop: '24px',
                padding: '16px 20px',
                borderRadius: '12px',
                backgroundColor: scanStatus === 'success' ? colors.successBg : colors.warningBg,
                color: scanStatus === 'success' ? colors.successText : colors.warningText,
                border: `1px solid ${scanStatus === 'success' ? '#bbf7d0' : '#fecaca'}`,
                textAlign: 'center',
              }}
            >
              <p style={{ margin: 0, fontWeight: 600, fontSize: '15px' }}>{message}</p>
            </div>

            {/* SCANNED GUEST RESULTS */}
            {scannedGuest && (
              <div
                style={{
                  marginTop: '24px',
                  backgroundColor: '#f8fafc',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '16px',
                  padding: '24px',
                }}
              >
                <p style={{ margin: '0 0 16px', color: colors.textMain, fontWeight: 700, fontSize: '16px' }}>
                  Verified Credentials
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                  {[
                    ['Name', scannedGuest.name],
                    ['Seat', scannedGuest.seat],
                    ['Flight', scannedGuest.flight],
                    ['Time', scannedGuest.time],
                    ['Class', scannedGuest.class.toUpperCase()],
                  ].map(([label, value]) => (
                    <div key={label} style={{ backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                      <p style={{ margin: 0, fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
                        {label}
                      </p>
                      <p style={{ margin: '4px 0 0', fontWeight: 700, color: colors.textMain, fontSize: '15px' }}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          
        </div>
      </div>
    </div>
  )
}

export default App
