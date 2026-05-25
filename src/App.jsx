console.log('NEW VERSION TEST')
import { Html5QrcodeScanner } from 'html5-qrcode'
import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'

<input
  value={scannerName}
  onChange={(e) => {
    setScannerName(e.target.value)
    localStorage.setItem('scanner_name', e.target.value)
  }}
  placeholder="请输入委员名字"
  style={{
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid #ccc',
    width: '100%',
    marginBottom: '20px'
  }}
/>
const FLIGHT = 'GD2026'
const ROUTE = 'BKI to FUTURE'
const TIME = '18:00'
const [scannerName, setScannerName] = useState(
  localStorage.getItem('scanner_name') || ''
)
const [stats, setStats] = useState({
  boarded: 0,
  total: 0
})
const [latestBoarded, setLatestBoarded] = useState(null)
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
  }
}

function App() {
  const [message, setMessage] = useState('请扫描票据二维码开始登机。')
  const [scanStatus, setScanStatus] = useState('success')
  const [isProcessing, setIsProcessing] = useState(false)
  const [scannedGuest, setScannedGuest] = useState(null)
  const [configWarning, setConfigWarning] = useState('')
  const [showWelcomeBurst, setShowWelcomeBurst] = useState(false)
  const [scanPulse, setScanPulse] = useState(false)

  const processingRef = useRef(false)
  const lastScannedRef = useRef('')
  const audioContextRef = useRef(null)

  const playSuccessSound = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext

    if (!AudioContext) {
      return
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }

    const context = audioContextRef.current

    if (context.state === 'suspended') {
      context.resume().catch(() => {})
    }

    const oscillator = context.createOscillator()
    const gainNode = context.createGain()

    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(660, context.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.12)

    gainNode.gain.setValueAtTime(0.001, context.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.32)

    oscillator.connect(gainNode)
    gainNode.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.34)
  }
  useEffect(() => {
  const channel = supabase
    .channel('welcome-screen')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'guests'
      },
      (payload) => {
        if (payload.new.boarded) {
          setLatestBoarded(payload.new)
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [])
  useEffect(() => {
    if (!supabase) {
      setConfigWarning('当前未配置 Supabase，二维码解析仍可展示本地票据信息。请在 Vercel 或本地环境填入 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。')
    }
  }, [])

  useEffect(() => {
  loadStats()

  const channel = supabase
    .channel('guest-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'guests'
      },
      () => {
        loadStats()
      }
    )
    .subscribe()
    const loadStats = async () => {
  const { count: total } = await supabase
    .from('guests')
    .select('*', { count: 'exact', head: true })

  const { count: boarded } = await supabase
    .from('guests')
    .select('*', { count: 'exact', head: true })
    .eq('boarded', true)

  setStats({
    boarded: boarded || 0,
    total: total || 0
  })
}

  return () => {
    supabase.removeChannel(channel)
  }
}, [])

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'reader',
      { fps: 10, qrbox: { width: 320, height: 320 }, rememberLastUsedCamera: true },
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
      setMessage('正在核对登机凭证...')
      setScanStatus('success')

      try {
        const parsed = JSON.parse(trimmed)
        const baseGuest = normalizeGuest(parsed)

        if (!baseGuest?.id || !baseGuest.name) {
          setScanStatus('warning')
          setMessage('❌ 无效登机牌的登机牌。')
          setScannedGuest(null)
          return
        }

        if (!supabase) {
          setMessage('❌ Supabase 未连接')
          return
        }

        // 调用 RPC
        const { data, error } = await supabase.rpc(
          'board_guest',
          {
            p_id: baseGuest.id,
            p_scanned_by: localStorage.getItem('scanner_name') || 'Unknown Scanner'
          }
        )

        if (error) {
          console.error(error)

          setScanStatus('warning')
          setMessage('❌ 数据库错误')
          return
        }

          // 已经登机
        if (!data.success) {
          setScanStatus('warning')
          setMessage(`❌ ${data.name || '该乘客'} 已经登机`)
          setScannedGuest(null)
          return
        }

        // 拉最新资料
        const { data: guestRecord } = await supabase
          .from('guests')
          .select('*')
          .eq('id', baseGuest.id)
          .single()
        const mergedGuest = {
          ...baseGuest,
          name: guestRecord.name,
          seat: normalizeSeat(guestRecord.group_num),
          class: guestRecord.type === 'graduate'
            ? 'business'
            : 'economy'
        }
        setScannedGuest(mergedGuest)

        setMessage(`🎉 欢迎登机，${mergedGuest.name}`)

        setScanStatus('success')

        playSuccessSound()

        setShowWelcomeBurst(true)
        setScanPulse(true)

        window.setTimeout(() => {
          setScanPulse(false)
        }, 900)

        window.setTimeout(() => {
          setShowWelcomeBurst(false)
        }, 2200)

      } catch (error) {
        console.error(error)

        setScanStatus('warning')
        setMessage('❌ QR 解析失败')
        setScannedGuest(null)

      } finally {
        setIsProcessing(false)
        processingRef.current = false

        // 3 秒后允许再次扫描
        setTimeout(() => {
          lastScannedRef.current = ''
        }, 3000)
      }
    })

    return () => {
      processingRef.current = false
      scanner.clear().catch(() => {})
    }
  }, [scannerName])

  const colors = {
    bg: '#f4f7fb',
    panel: '#ffffff',
    primary: '#2563eb',
    textMain: '#0f172a',
    textMuted: '#52607a',
    border: '#d9e3f1',
    successBg: '#ecfdf5',
    successText: '#047857',
    warningBg: '#fef2f2',
    warningText: '#b91c1c',
    glow: 'rgba(37, 99, 235, 0.24)',
  }

  const credentialItems = scannedGuest
    ? [
        ['姓名', scannedGuest.name],
        ['座位', scannedGuest.seat],
        ['航班', scannedGuest.flight],
        ['时间', scannedGuest.time],
        ['目的地', scannedGuest.destination],
        ['舱位', scannedGuest.class.toUpperCase()],
      ]
    : []

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '28px 20px 40px',
        background:
          'radial-gradient(circle at top left, rgba(191, 219, 254, 0.88), transparent 30%), radial-gradient(circle at top right, rgba(224, 231, 255, 0.78), transparent 28%), linear-gradient(180deg, #f9fcff 0%, #f4f8fd 52%, #ffffff 100%)',
        color: colors.textMain,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(16px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }

        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.28); }
          70% { box-shadow: 0 0 0 18px rgba(37, 99, 235, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
        }
      `}</style>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '999px',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              color: colors.primary,
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '1.1px',
              textTransform: 'uppercase',
            }}
          >
            ✨ 2026 下半年欢送会
          </div>
          <h1
            style={{
              margin: '14px 0 10px',
              fontSize: 'clamp(2.1rem, 3.6vw, 3rem)',
              lineHeight: 1.05,
              fontWeight: 900,
              color: '#0f172a',
            }}
          >
            欢迎大厅
          </h1>
          <p
            style={{
              margin: '0 auto',
              maxWidth: '720px',
              color: colors.textMuted,
              fontSize: '16px',
              lineHeight: 1.7,
            }}
          >
            扫描登机牌二维码，即刻进入欢迎大厅，展示“欢迎登机”与完整凭证。
          </p>
        </div>

        {configWarning && (
          <div
            style={{
              marginBottom: '24px',
              padding: '16px 18px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%)',
              color: '#854d0e',
              border: '1px solid #fde68a',
              textAlign: 'center',
              fontSize: '15px',
              fontWeight: 800,
            }}
          >
            {configWarning}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.05fr 0.95fr',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          <section
            style={{
              backgroundColor: colors.panel,
              borderRadius: '28px',
              padding: '28px',
              border: `1px solid ${colors.border}`,
              boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '18px',
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1.1px', color: colors.primary, fontWeight: 800 }}>
                  扫码区
                </p>
                <h2 style={{ margin: '6px 0 0', fontSize: '22px', color: colors.textMain }}>扫码登机</h2>
              </div>
              <span
                style={{
                  padding: '8px 14px',
                  borderRadius: '999px',
                  backgroundColor: isProcessing ? '#dbeafe' : colors.successBg,
                  color: isProcessing ? '#1d4ed8' : colors.successText,
                  fontWeight: 800,
                  fontSize: '13px',
                }}
              >
                {isProcessing ? '识别中...' : '相机已开启'}
              </span>
            </div>

            <div
              style={{
                padding: '10px',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(59,130,246,0.04))',
                border: `1px solid ${colors.border}`,
                animation: scanPulse ? 'pulseGlow 0.9s ease-out' : 'none',
              }}
            >
              <div id="reader" style={{ borderRadius: '18px', overflow: 'hidden' }} />
            </div>

            <div
              style={{
                marginTop: '18px',
                padding: '16px 18px',
                borderRadius: '18px',
                backgroundColor: scanStatus === 'success' ? colors.successBg : colors.warningBg,
                color: scanStatus === 'success' ? colors.successText : colors.warningText,
                border: `1px solid ${scanStatus === 'success' ? '#a7f3d0' : '#fecaca'}`,
                textAlign: 'center',
                boxShadow: scanStatus === 'success' ? `0 12px 30px ${colors.glow}` : 'none',
              }}
            >
              <p style={{ margin: 0, fontWeight: 800, fontSize: '15px' }}>{message}</p>
            </div>
          </section>

          <section
            style={{
              backgroundColor: colors.panel,
              borderRadius: '28px',
              padding: '28px',
              border: `1px solid ${colors.border}`,
              boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)',
            }}
          >
            <p style={{ margin: 0, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1.1px', color: colors.primary, fontWeight: 800 }}>
              欢迎大厅
            </p>
            <h2 style={{ margin: '8px 0 10px', fontSize: '22px', color: colors.textMain }}>欢迎登机展示</h2>
            <p style={{ margin: '0 0 18px', color: colors.textMuted, lineHeight: 1.7 }}>
              扫描成功后，这里会切换成大屏式欢迎卡片，并展示当前者的完整凭证。
            </p>

            {scannedGuest ? (
              <div
                style={{
                  position: 'relative',
                  padding: '24px 24px 22px',
                  borderRadius: '24px',
                  background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #38bdf8 100%)',
                  color: '#ffffff',
                  boxShadow: '0 24px 48px rgba(37, 99, 235, 0.24)',
                  overflow: 'hidden',
                  animation: showWelcomeBurst ? 'floatUp 0.45s ease-out' : 'none',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '-34px',
                    right: '-34px',
                    width: '150px',
                    height: '150px',
                    borderRadius: '999px',
                    background: 'rgba(255,255,255,0.14)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-42px',
                    left: '-28px',
                    width: '130px',
                    height: '130px',
                    borderRadius: '999px',
                    background: 'rgba(191, 219, 254, 0.16)',
                  }}
                />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.88, fontWeight: 800 }}>
                        欢迎登机
                      </p>
                      <h3 style={{ margin: '10px 0 0', fontSize: '32px', fontWeight: 900, lineHeight: 1.05 }}>{scannedGuest.name}</h3>
                    </div>
                    <span
                      style={{
                        padding: '8px 12px',
                        borderRadius: '999px',
                        backgroundColor: 'rgba(255,255,255,0.18)',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '13px',
                      }}
                    >
                      {scannedGuest.class.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ margin: '14px 0 0', lineHeight: 1.8, opacity: 0.95 }}>
                    已成功完成登机验证，当前航班 {scannedGuest.flight}，座位 {scannedGuest.seat}，目的地 {scannedGuest.destination}。
                  </p>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
                  borderRadius: '24px',
                  border: `1px dashed ${colors.border}`,
                  padding: '26px',
                  color: colors.textMuted,
                  lineHeight: 1.8,
                }}
              >
                等待扫码后，系统会把欢迎登机信息以大屏样式展示出来。
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginTop: '16px' }}>
              {credentialItems.map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '16px',
                    border: `1px solid ${colors.border}`,
                    padding: '13px 14px',
                  }}
                >
                  <p style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', color: colors.textMuted, fontWeight: 800, letterSpacing: '0.5px' }}>
                    {label}
                  </p>
                  <p style={{ margin: '6px 0 0', fontWeight: 800, color: colors.textMain, fontSize: '15px' }}>{value}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default App