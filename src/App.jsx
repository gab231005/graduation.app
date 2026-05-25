import { Html5QrcodeScanner } from 'html5-qrcode'
import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import TicketGenerator from './TicketGenerator'

const FLIGHT = 'GD2026'
const ROUTE = 'BKI to FUTURE'
const TIME = '18:00'

const normalizeSeat = (value) => {
  const cleaned = String(value ?? '').replace(/\D/g, '')
  if (!cleaned) return '001'
  return cleaned.slice(-3).padStart(3, '0')
}

const normalizeGuest = (payload) => {
  if (!payload) return null
  const guestClass = payload.class?.toLowerCase() || payload.type?.toLowerCase() || payload.role?.toLowerCase() || 'economy'
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
    if (!supabase || currentView !== 'scanner') return

    const scanner = new Html5QrcodeScanner(
      'reader',
      { fps: 10, qrbox: { width: 280, height: 280 }, rememberLastUsedCamera: true },
      false
    )

    scanner.render(async (text) => {
      if (processingRef.current) return
      const trimmed = String(text).trim()
      if (!trimmed || trimmed === lastScannedRef.current) return

      lastScannedRef.current = trimmed
      processingRef.current = true
      setIsProcessing(true)
      setMessage('Checking the participant record...')
      setScanStatus('success')

      try {
        const parsed = JSON.parse(trimmed)
        const baseGuest = normalizeGuest(parsed)
        if (!baseGuest?.id) throw new Error('Invalid QR')

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

        const mergedGuest = { ...baseGuest, ...guestRecord, food_redeemed: guestRecord.food_redeemed ?? false }
        setScannedGuest(mergedGuest)

        if (mode === 'onboarding') {
          setMessage(`✅ Welcome onboard, ${mergedGuest.name}!`)
        } else if (mergedGuest.food_redeemed) {
          setScanStatus('warning')
          setMessage(`⚠️ ${mergedGuest.name} has already redeemed the food.`)
        } else {
          const { error: updateError } = await supabase.from('guests').update({ food_redeemed: true }).eq('id', mergedGuest.id)
          if (updateError) throw new Error('Update failed')
          setMessage(`✅ ${mergedGuest.name} redeemed successfully.`)
        }
      } catch (error) {
        setScanStatus('warning')
        setMessage('❌ Error: Could not process request.')
        setScannedGuest(null)
      } finally {
        setIsProcessing(false)
        processingRef.current = false
      }
    })

    return () => { scanner.clear().catch(() => {}) }
  }, [mode, currentView])

  const colors = { bg: '#f0f4f8', cardBg: '#ffffff', primary: '#2563eb', textMain: '#1e293b', textMuted: '#64748b' }

  return (
    <div style={{ minHeight: '100vh', padding: '32px 24px', backgroundColor: colors.bg, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* NAVIGATION */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', justifyContent: 'center' }}>
          <button onClick={() => setCurrentView('scanner')} style={{ padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', background: currentView === 'scanner' ? colors.primary : '#e2e8f0', color: currentView === 'scanner' ? 'white' : 'black', border: 'none' }}>📷 Scanner</button>
          <button onClick={() => setCurrentView('tickets')} style={{ padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', background: currentView === 'tickets' ? colors.primary : '#e2e8f0', color: currentView === 'tickets' ? 'white' : 'black', border: 'none' }}>🎟️ Tickets</button>
        </div>

        {currentView === 'tickets' ? (
          <div style={{ backgroundColor: colors.cardBg, padding: '32px', borderRadius: '20px' }}><TicketGenerator /></div>
        ) : (
          <div>
            {/* ... Paste your original Scanner UI here ... */}
            <div id="reader" style={{ borderRadius: '12px', overflow: 'hidden' }} />
            <div style={{ marginTop: '20px', padding: '16px', background: scanStatus === 'success' ? '#dcfce7' : '#fee2e2', borderRadius: '12px', textAlign: 'center' }}>{message}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App