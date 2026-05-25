import { useEffect, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import html2canvas from 'html2canvas'
import { supabase } from './lib/supabase'

const FLIGHT_NO = 'GD2026'
const TIME = '18:00'
const ROUTE = 'BKI to FUTURE'

const formatSeat = (value) => {
  const cleaned = String(value ?? '').replace(/\D/g, '')

  if (!cleaned) {
    return '001'
  }

  return cleaned.slice(-3).padStart(3, '0')
}

function TicketGenerator() {
  const [participants, setParticipants] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    const fetchGuests = async () => {
      if (!supabase) {
        setLoadError('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel to load participant data.')
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('guests')
        .select('id,name,group_num,type')
        .order('id', { ascending: true })

      if (error) {
        console.error('Error fetching data:', error)
        setLoadError('Unable to load participant data from Supabase.')
      } else {
        setParticipants(data ?? [])
      }

      setIsLoading(false)
    }

    fetchGuests()
  }, [])

  const downloadTicketAsPNG = async (personId, personName) => {
    const ticketElement = document.getElementById(`ticket-${personId}`)

    if (!ticketElement) {
      return
    }

    try {
      const canvas = await html2canvas(ticketElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      })

      const imageURL = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.href = imageURL
      downloadLink.download = `BoardingPass_${personName.replace(/\s+/g, '_')}.png`
      downloadLink.click()
    } catch (error) {
      console.error('Failed to generate image:', error)
      alert('图片生成失败 (Failed to generate image)')
    }
  }

  // UI Theme Colors
  const colors = {
    primary: '#2563eb',
    textMain: '#1e293b',
    textMuted: '#64748b',
    border: '#e2e8f0',
    premiumBg: '#0f172a',
    premiumAccent: '#3b82f6',
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <p style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: colors.textMain }}>Loading boarding passes...</p>
        <p style={{ margin: '8px 0 0', color: colors.textMuted }}>Fetching the latest participant list.</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div style={{ padding: '20px', backgroundColor: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
        <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#991b1b' }}>System Offline</p>
        <p style={{ margin: '6px 0 0', color: '#b91c1c', fontSize: '14px' }}>{loadError}</p>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <p style={{ margin: 0, color: colors.primary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '13px' }}>
          Participant Roster
        </p>
        <h2 style={{ margin: '8px 0 6px', fontSize: '24px', color: colors.textMain }}>Generated Boarding Passes</h2>
        <p style={{ margin: 0, color: colors.textMuted, fontSize: '15px' }}>Total participants: <strong>{participants.length}</strong></p>
      </div>

      <div style={{ display: 'grid', gap: '40px', justifyItems: 'center' }}>
        {participants.map((person) => {
          const isBusiness = person.type === 'graduate'
          const seat = formatSeat(person.group_num)
          const qrData = {
            id: person.id,
            name: person.name,
            seat,
            flight: FLIGHT_NO,
            time: TIME,
            destination: ROUTE,
            class: isBusiness ? 'business' : 'economy',
          }

          return (
            <div key={person.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%', maxWidth: '680px' }}>
              
              {/* TICKET CARD (Target for HTML2Canvas) */}
              <div
                id={`ticket-${person.id}`}
                style={{
                  width: '100%',
                  minHeight: '240px',
                  borderRadius: '16px',
                  display: 'flex',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
                  backgroundColor: isBusiness ? colors.premiumBg : '#ffffff',
                  color: isBusiness ? '#ffffff' : colors.textMain,
                  border: `1px solid ${isBusiness ? '#1e293b' : colors.border}`,
                  overflow: 'hidden',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
              >
                {/* LEFT SIDE - DETAILS */}
                <div style={{ flex: 1, padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: isBusiness ? '#1e3a8a' : '#eff6ff',
                          color: isBusiness ? '#bfdbfe' : colors.primary,
                          fontWeight: 700,
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '12px'
                        }}
                      >
                        {isBusiness ? 'Premium Pass' : 'Standard Pass'}
                      </span>
                      <h3 style={{ margin: 0, fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px' }}>
                        {person.name}
                      </h3>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '32px', marginTop: '24px' }}>
                    {[
                      ['Flight', FLIGHT_NO],
                      ['Seat', seat],
                      ['Time', TIME],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: isBusiness ? '#94a3b8' : colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {label}
                        </p>
                        <p style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 700 }}>
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: `1px solid ${isBusiness ? '#334155' : colors.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: isBusiness ? '#cbd5e1' : colors.textMuted }}>
                        <strong>Route:</strong> {ROUTE}
                      </p>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: isBusiness ? '#cbd5e1' : colors.textMuted }}>
                        Graduation Ceremony
                      </p>
                    </div>
                  </div>
                </div>

                {/* RIGHT SIDE - QR CODE */}
                <div
                  style={{
                    width: '200px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isBusiness ? '#1e293b' : '#f8fafc',
                    borderLeft: `2px dashed ${isBusiness ? '#475569' : '#cbd5e1'}`,
                  }}
                >
                  <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <QRCodeCanvas value={JSON.stringify(qrData)} size={120} level="H" />
                  </div>
                  <p style={{ margin: '16px 0 0', fontSize: '12px', fontWeight: 600, color: isBusiness ? '#94a3b8' : colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Scan to Board
                  </p>
                </div>
              </div>

              {/* ACTION BUTTON */}
              <button
                type="button"
                onClick={() => downloadTicketAsPNG(person.id, person.name)}
                style={{
                  padding: '10px 24px',
                  borderRadius: '999px',
                  border: 'none',
                  backgroundColor: colors.primary,
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download PNG
              </button>
              
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default TicketGenerator