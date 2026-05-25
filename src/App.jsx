import { Html5QrcodeScanner } from 'html5-qrcode'
import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import TicketGenerator from './TicketGenerator'

const FLIGHT = 'GD2026'
const ROUTE = 'BKI to FUTURE'
const TIME = '18:00'

const normalizeSeat = (value) => {
  const cleaned = String(value ?? '').replace(/\D/g, '')
  return !cleaned ? '001' : cleaned.slice(-3).padStart(3, '0')
}

function App() {
  const [currentView, setCurrentView] = useState('scanner')
  const [mode, setMode] = useState('onboarding')
  const [message, setMessage] = useState('Scan the participant QR code to begin.')
  const [scanStatus, setScanStatus] = useState('success')
  const [isProcessing, setIsProcessing] = useState(false)
  const [scannedGuest, setScannedGuest] = useState(null)
  
  const processingRef = useRef(false)
  const lastScannedRef = useRef('')

  useEffect(() => {
    if (currentView !== 'scanner') return
    const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: { width: 280, height: 280 }, rememberLastUsedCamera: true }, false)
    
    scanner.render(async (text) => {
      if (processingRef.current) return
      const trimmed = String(text).trim()
      if (!trimmed || trimmed === lastScannedRef.current) return
      
      lastScannedRef.current = trimmed
      processingRef.current = true
      setIsProcessing(true)
      
      try {
        const parsed = JSON.parse(trimmed)
        const id = parsed.id ?? parsed.participant_id
        const { data: guestRecord } = await supabase.from('guests').select('*').eq('id', id).single()
        
        if (!guestRecord) {
          setScanStatus('warning'); setMessage('❌ Record not found.')
        } else {
          setScannedGuest(guestRecord)
          setScanStatus('success'); setMessage(`✅ Checked in: ${guestRecord.name}`)
        }
      } catch {
        setScanStatus('warning'); setMessage('❌ Invalid QR.')
      } finally {
        setIsProcessing(false); processingRef.current = false
      }
    })
    return () => { scanner.clear().catch(() => {}) }
  }, [currentView, mode])

  const colors = { bg: '#f0f4f8', cardBg: '#ffffff', primary: '#2563eb', textMain: '#1e293b', textMuted: '#64748b', border: '#e2e8f0' }

  return (
    <div style={{ minHeight: '100vh', padding: '32px 24px', backgroundColor: colors.bg, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Navigation Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', justifyContent: 'center' }}>
          <button onClick={() => setCurrentView('scanner')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: currentView === 'scanner' ? colors.primary : colors.cardBg, color: currentView === 'scanner' ? 'white' : colors.textMain, cursor: 'pointer', fontWeight: 'bold' }}>📷 Scanner</button>
          <button onClick={() => setCurrentView('tickets')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: currentView === 'tickets' ? colors.primary : colors.cardBg, color: currentView === 'tickets' ? 'white' : colors.textMain, cursor: 'pointer', fontWeight: 'bold' }}>🎟️ Ticket Generator</button>
        </div>

        {/* View Switcher */}
        {currentView === 'tickets' ? (
          <div style={{ backgroundColor: colors.cardBg, padding: '32px', borderRadius: '20px', border: `1px solid ${colors.border}` }}>
            <TicketGenerator />
          </div>
        ) : (
          <div style={{ backgroundColor: colors.cardBg, padding: '32px', borderRadius: '20px', border: `1px solid ${colors.border}` }}>
            <h2 style={{ marginTop: 0 }}>Participant Check-in</h2>
            <div id="reader" style={{ borderRadius: '12px', border: `1px solid ${colors.border}` }} />
            <div style={{ marginTop: '20px', padding: '16px', borderRadius: '12px', backgroundColor: scanStatus === 'success' ? '#dcfce7' : '#fee2e2', textAlign: 'center' }}>
              {message}
            </div>
            {scannedGuest && (
              <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
                <p><strong>Name:</strong> {scannedGuest.name}</p>
                <p><strong>Seat:</strong> {scannedGuest.group_num}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App