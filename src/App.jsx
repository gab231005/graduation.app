import { Html5QrcodeScanner } from 'html5-qrcode'
import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import TicketGenerator from './TicketGenerator'

// ... (Keep your FLIGHT, ROUTE, TIME constants and normalization functions here)
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
  const [currentView, setCurrentView] = useState('scanner')
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

  const colors = {
    bg: '#f0f4f8', cardBg: '#ffffff', primary: '#2563eb', 
    primaryLight: '#eff6ff', textMain: '#1e293b', 
    textMuted: '#64748b', border: '#e2e8f0',
    successBg: '#dcfce7', successText: '#166534',
    warningBg: '#fee2e2', warningText: '#991b1b',
  }

  return (
    <div style={{ minHeight: '100vh', padding: '32px 24px', backgroundColor: colors.bg, color: colors.textMain, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* NAVIGATION BUTTONS */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', justifyContent: 'center' }}>
          {[
            { id: 'scanner', label: '📷 Scanner Dashboard' },
            { id: 'tickets', label: '🎟️ Ticket Generator' }
          ].map((view) => (
            <button
              key={view.id}
              onClick={() => setCurrentView(view.id)}
              style={{
                padding: '12px 24px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontWeight: 700,
                backgroundColor: currentView === view.id ? colors.primary : colors.cardBg,
                color: currentView === view.id ? '#ffffff' : colors.textMain,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            >
              {view.label}
            </button>
          ))}
        </div>

        {/* CONTENT SWITCHER */}
        {currentView === 'scanner' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
             {/* PASTE YOUR ORIGINAL SCANNER UI HERE */}
             {/* (Including the Mode Toggles, Scanner Section, and Results Card) */}
          </div>
        ) : (
          <section style={{ backgroundColor: colors.cardBg, borderRadius: '20px', padding: '32px', border: `1px solid ${colors.border}`, boxShadow: '0 10px 25px rgba(0, 0, 0, 0.02)' }}>
            <TicketGenerator />
          </section>
        )}

      </div>
    </div>
  )
}

export default App