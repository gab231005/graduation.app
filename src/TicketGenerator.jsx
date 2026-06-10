import { useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import html2canvas from 'html2canvas'
import { supabase } from './lib/supabase'
import logoDoodle from './assets/logo_doodle.png'
import diamondBackground from './assets/images.jpg'

const FLIGHT_NO = 'BKI2026'
const TIME = '18:00'
const DATE = '13 JUNE 2026'
const GATE = '01'
const AIRLINE = 'SMTM 主恩大专'
const FROM_CODE = 'BKI'
const TO_CODE = 'FUTURE'
const MOTTO = '耶和华说：我知道我向你们所怀的意念，是赐平安的意念，不是降灾祸的意念，要叫你们末后有指望（耶利米书 29:11）'
const REMINDER = '请看护你们曾经的激情和理想，在这个怀疑的时代，我们依旧需要信仰'

const formatSeat = (value) => {
  const cleaned = String(value ?? '').replace(/\D/g, '')
  if (!cleaned) return '001'
  return cleaned.slice(-3).padStart(3, '0')
}

function Barcode({ value, width = 180, height = 48 }) {
  const bars = []
  let x = 0
  const seed = value.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const totalBars = 60
  const unitW = width / totalBars
  for (let i = 0; i < totalBars; i++) {
    const isThin = (seed * (i + 3) * 7 + i * 13) % 3 !== 0
    const barW = isThin ? unitW * 0.8 : unitW * 1.4
    if ((seed + i) % 2 === 0) {
      bars.push(<rect key={i} x={x} y={0} width={barW} height={height} fill="#111" />)
    }
    x += barW + unitW * 0.3
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      {bars}
    </svg>
  )
}

function Seal({ color = '#c9a227', size = 72 }) {
  const [imgFailed, setImgFailed] = useState(false)
  if (imgFailed) {
    return (
      <svg width={size} height={size} viewBox="0 0 72 72">
        <circle cx="36" cy="36" r="34" fill="none" stroke={color} strokeWidth="2.5" />
        <text x="36" y="40" textAnchor="middle" fontSize="7" fontWeight="700" fill={color} fontFamily="serif">SMTM</text>
      </svg>
    )
  }
  return (
    <img
      src={logoDoodle}
      alt="SMTM 主恩大专"
      style={{ width: '180px', height: '128px', objectFit: 'contain' }}
      onError={() => setImgFailed(true)}
    />
  )
}

function BoardingPass({ person }) {
  const isGraduate = person.type === 'graduate'
  const seat = formatSeat(person.group_num)

  const accentColor = isGraduate ? '#C0C0C0' : '#1a3a6b'
  const accentLight = isGraduate ? 'rgba(255,255,255,0.82)' : '#dbeafe'
  const borderColor = isGraduate ? '#D4AF37' : '#1a3a6b'
  const headerBg = isGraduate ? 'rgba(186, 182, 255, 0.86)' : '#1a3a6b'
  const headerText = isGraduate ? '#7B2CBF' : '#dbeafe'
  const footerBg = isGraduate ? 'rgba(186, 182, 255, 0.86)' : '#1a3a6b'
  const footerText = isGraduate ? '#7B2CBF' : '#dbeafe'
  const labelColor = isGraduate ? '#5B2A86' : '#555'
  const valueColor = isGraduate ? '#111111' : '#111'
  const scanColor = '#111111'
  const airplaneColor = isGraduate ? '#D4AF37' : accentColor

  const qrData = JSON.stringify({
    id: person.id,
    name: person.name,
    seat,
    flight: FLIGHT_NO,
    time: TIME,
    date: DATE,
  })

  return (
    <div
      id={`ticket-${person.id}`}
      style={{
        width: '100%',
        maxWidth: '940px',
        aspectRatio: '2 / 1',
        backgroundColor: isGraduate ? 'transparent' : '#ffffff',
        backgroundImage: isGraduate
          ? `linear-gradient(rgba(255,255,255,0.50), rgba(255,255,255,0.50)), url(${diamondBackground})`
          : 'none',
        backgroundSize: isGraduate ? 'cover' : 'auto',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        border: `2px solid ${borderColor}`,
        borderRadius: '6px',
        overflow: 'hidden',
        fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
        boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ══ MAIN BODY ══ */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ════ LEFT MAIN SECTION ════ */}
        <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column' }}>

          {/* Header bar */}
          <div style={{ background: headerBg, padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '42px', boxSizing: 'border-box' }}>
            <span style={{ color: headerText, fontWeight: 900, fontSize: '14px', letterSpacing: '1.2px', lineHeight: 1 }}>{AIRLINE}</span>
            <span style={{ background: accentLight, color: isGraduate ? headerText : headerBg, fontWeight: 700, fontSize: '11px', minWidth: '54px', height: '22px', padding: '0 9px', borderRadius: '3px', letterSpacing: '1px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', lineHeight: 1 }}>2026</span>
          </div>

          {/* Content: 3 columns */}
          <div style={{ flex: 1, padding: '32px 24px 24px 16px', display: 'flex', gap: '14px', alignItems: 'stretch', minHeight: 0, boxSizing: 'border-box' }}>

            {/* Col 1: SEAT / TIME / GATE */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '130px', flexShrink: 0, justifyContent: 'space-between' }}>
              <div style={{ border: `1.5px solid ${borderColor}`, borderRadius: '4px', padding: '6px 8px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(2px)' }}>
                <div style={{ fontSize: '18px', color: labelColor, fontWeight: 1000, letterSpacing: '1px' }}>SEAT</div>
                <div style={{ fontSize: '28px', fontWeight: 1200, color: valueColor, lineHeight: 1.05, letterSpacing: '2px' }}>{seat}</div>
              </div>

              <div style={{ border: `1.5px solid ${borderColor}`, borderRadius: '4px', padding: '6px 8px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(2px)' }}>
                <div style={{ fontSize: '18px', color: labelColor, fontWeight: 1000, letterSpacing: '1px' }}>TIME</div>
                <div style={{ fontSize: '20px', fontWeight: 1200, color: valueColor, lineHeight: 1.05 }}>{TIME}</div>
                <div style={{ fontSize: '11px', color: labelColor, marginTop: '1px' }}>DATE  {DATE}</div>
              </div>

              <div style={{ border: `1.5px solid ${borderColor}`, borderRadius: '4px', padding: '6px 8px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(2px)' }}>
                <div style={{ fontSize: '18px', color: labelColor, fontWeight: 1000, letterSpacing: '1px' }}>BOARDING GATE</div>
                <div style={{ fontSize: '15px', fontWeight: 1200, color: valueColor, lineHeight: 1.1, letterSpacing: '1px' }}>主恩堂圣堂</div>
              </div>
            </div>

            {/* Col 2: QR code */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '5px',
              width: '280px',
              flexShrink: 0,
              paddingBottom: '0',
              paddingTop: '0',
            }}>
              <div style={{ background: 'rgba(255,255,255,0.82)', padding: '3px', borderRadius: '4px', border: `1.5px solid ${borderColor}`, backdropFilter: 'blur(2px)' }}>
                <QRCodeCanvas value={qrData} size={250} level="H" />
              </div>
              <div style={{ fontSize: '12px', fontWeight: 900, color: scanColor, letterSpacing: '1px', textAlign: 'center' }}>SCAN TO BOARD</div>
            </div>

            {/* Col 3: flight label + motto + notice */}
            <div style={{ flex: '0 0 168px', maxWidth: '120px', minWidth: '120px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0, justifyContent: 'space-between' }}>
              <div style={{ fontSize: '10px', color: labelColor, fontWeight: 900, letterSpacing: '1px', textAlign: 'center' }}>FLIGHT {FLIGHT_NO}</div>

              <div style={{
                border: `1.5px solid ${borderColor}`,
                borderRadius: '4px',
                padding: '8px 9px',
                display: 'flex',
                alignItems: 'center',
                minHeight: '150px',
                background: 'rgba(255,255,255,0.82)',
                backdropFilter: 'blur(2px)',
              }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 1400,
                  color: '#111111',
                  fontFamily: '"STKaiti", "KaiTi", "楷体", "FangSong", serif',
                  lineHeight: 1.3,
                  letterSpacing: '0.5px',
                }}>
                  {MOTTO}
                </div>
              </div>

              <div style={{ fontSize: '8px', color: '#777', lineHeight: 1.35, padding: '2px 2px', minHeight: '72px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'rgba(255,255,255,0.72)', borderRadius: '4px', textAlign: 'center' }}>
                 <div style={{ fontWeight: 700 }}>重要提示: 登机口于起飞前10分钟关闭</div>
                 <div>NOTICE: GATES WILL BE CLOSED 10 MINUTES BEFORE DEPARTURE TIME</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tear line ── */}
        <div style={{ width: '18px', display: 'flex', alignItems: 'stretch', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: '-2px', left: '50%', transform: 'translateX(-50%)', width: '14px', height: '8px', borderRadius: '0 0 8px 8px', background: '#f0efe9', border: `1.5px solid ${borderColor}`, borderTop: 'none' }} />
          <svg width="4" style={{ flex: 1, margin: '8px 0', overflow: 'visible' }} preserveAspectRatio="none">
            <line x1="8.5" y1="0" x2="8.5" y2="100%" stroke={borderColor} strokeWidth="4" strokeDasharray="8 5" />
          </svg>
          <div style={{ position: 'absolute', bottom: '-2px', left: '50%', transform: 'translateX(-50%)', width: '14px', height: '8px', borderRadius: '8px 8px 0 0', background: '#f0efe9', border: `1.5px solid ${borderColor}`, borderBottom: 'none' }} />
        </div>

        {/* ════ RIGHT STUB ════ */}
        <div style={{ width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <div style={{ background: headerBg, padding: '7px 12px', minHeight: '40px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: headerText, fontWeight: 900, fontSize: '14px', letterSpacing: '1px', lineHeight: 1 }}>
            {AIRLINE}
          </div>

          <div style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '128px', flexShrink: 0 }}>
              <img
                src={logoDoodle}
                alt="SMTM 主恩大专"
                style={{ width: '198px', height: 'auto', maxHeight: '128px', objectFit: 'contain', display: 'block', maxWidth: '100%' }}
              />
            </div>
            <div style={{ border: `1.5px solid ${borderColor}`, borderRadius: '4px', padding: '2px 6px', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(2px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: labelColor, fontWeight: 1500, letterSpacing: '1px', marginBottom: '1px' }}>
                <span>FROM</span><span>TO</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '25px', fontWeight: 900, color: valueColor, letterSpacing: '0.7px' }}>
                <span>{FROM_CODE}</span>
                <span style={{ color: airplaneColor, fontSize: '30px' }}>✈</span>
                <span>{TO_CODE}</span>
              </div>
            </div>

            <div style={{ border: `1.5px solid ${borderColor}`, borderRadius: '4px', padding: '2px 6px', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(2px)' }}>
              <div style={{ fontSize: '18px', color: labelColor, fontWeight: 1500, letterSpacing: '1px', marginBottom: '1px' }}>NAME</div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 900,
                  color: valueColor,
                  letterSpacing: '1px',
                  wordBreak: 'normal',
                  overflowWrap: 'normal',
                  whiteSpace: person.name.includes(' ') ? 'normal' : 'nowrap',
                }}
              >
                {person.name}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ BOTTOM REMINDER BANNER ══ */}
      <div style={{ background: footerBg, padding: '8px 14px', fontSize: '10px', color: footerText, fontWeight: 600, letterSpacing: '0.5px', lineHeight: 1.25, flexShrink: 0 }}>
        REMINDER: {REMINDER}
      </div>
    </div>
  )
}

function TicketGenerator() {
  const [query, setQuery] = useState('')
  const [participants, setParticipants] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [message, setMessage] = useState('请输入姓名，系统会自动从 Supabase 匹配并生成机票。')
  const [loadError, setLoadError] = useState('')

  const searchParticipants = async () => {
    const trimmedQuery = query.trim()

    if (!trimmedQuery) {
      setParticipants([])
      setMessage('请输入姓名，系统会自动从 Supabase 匹配并生成机票。')
      return
    }

    if (!supabase) {
      setLoadError('请先在环境变量中配置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。')
      setParticipants([])
      return
    }

    setIsSearching(true)
    setLoadError('')
    setMessage('正在查询姓名...')

    const { data, error } = await supabase
      .from('guests')
      .select('id,name,group_num,type')
      .ilike('name', `%${trimmedQuery}%`)
      .order('name', { ascending: true })

    setIsSearching(false)

    if (error) {
      console.error('Error fetching data:', error)
      setLoadError('无法从 Supabase 拉取数据，请检查表名与权限配置。')
      setParticipants([])
      setMessage('查询失败。')
      return
    }

    if (!data?.length) {
      setParticipants([])
      setMessage('未找到匹配姓名，请检查是否为完整姓名或重新输入。')
      return
    }

    setParticipants(data)
    setMessage(`已找到 ${data.length} 位匹配人员。`)
  }

  const downloadTicketAsPNG = async (personId, personName) => {
    const ticketElement = document.getElementById(`ticket-${personId}`)
    if (!ticketElement) return
    try {
      const canvas = await html2canvas(ticketElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f0efe9',
      })
      const imageURL = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.href = imageURL
      downloadLink.download = `BoardingPass_${personName.replace(/\s+/g, '_')}.png`
      downloadLink.click()
    } catch (error) {
      console.error('Failed to generate image:', error)
      alert('图片生成失败')
    }
  }

  return (
    <div style={{ fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif', minHeight: '100vh' }}>

      {/* ══ HERO HEADER ══ */}
      <div style={{
        background: 'linear-gradient(135deg, #0b1a33 0%, #1a3a6b 60%, #0b1a33 100%)',
        padding: '48px 24px 56px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.06,
          backgroundImage: 'repeating-linear-gradient(45deg, #c9a227 0px, #c9a227 1px, transparent 1px, transparent 28px)',
          pointerEvents: 'none',
        }} />

        <div style={{
          display: 'inline-block',
          background: '#c9a227',
          color: '#0b1a33',
          fontWeight: 900,
          fontSize: '11px',
          letterSpacing: '3px',
          padding: '4px 18px',
          borderRadius: '2px',
          marginBottom: '18px',
          textTransform: 'uppercase',
        }}>
          ✈ &nbsp; 2026 下半年欢送会 &nbsp; ✈
        </div>

        <h1 style={{
          margin: '0 0 14px',
          fontSize: 'clamp(2.4rem, 5vw, 3.4rem)',
          fontWeight: 900,
          color: '#ffffff',
          letterSpacing: '4px',
          lineHeight: 1.1,
        }}>
          机票生成器
        </h1>

        <p style={{
          margin: '0 auto 32px',
          maxWidth: '500px',
          color: '#a0b4cc',
          fontSize: '14px',
          lineHeight: 1.8,
          letterSpacing: '0.3px',
        }}>
          输入参与者姓名，系统会直接从 Supabase 查询并生成对应的登机牌
        </p>

        {/* Search bar */}
        <div style={{
          display: 'flex',
          maxWidth: '480px',
          margin: '0 auto',
          background: '#f0efe9',
          borderRadius: '6px',
          overflow: 'hidden',
          border: '2px solid #c9a227',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') searchParticipants() }}
            placeholder="输入姓名搜索..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '16px',
              padding: '14px 18px',
              color: '#0b1a33',
              background: 'transparent',
              fontWeight: 600,
              fontFamily: 'inherit',
            }}
          />
          <button
            type="button"
            onClick={searchParticipants}
            disabled={isSearching}
            style={{
              padding: '14px 24px',
              border: 'none',
              background: '#c9a227',
              color: '#0b1a33',
              fontWeight: 900,
              fontSize: '14px',
              cursor: isSearching ? 'not-allowed' : 'pointer',
              letterSpacing: '1px',
              flexShrink: 0,
              fontFamily: 'inherit',
              opacity: isSearching ? 0.7 : 1,
            }}
          >
            {isSearching ? '查询中...' : '搜 索'}
          </button>
        </div>

        <div style={{
          position: 'absolute', bottom: -1, left: 0, right: 0, height: '28px',
          background: '#f0efe9',
          clipPath: 'ellipse(55% 100% at 50% 100%)',
        }} />
      </div>

      {/* ══ CONTENT AREA ══ */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '36px 20px 72px' }}>

        {loadError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '14px 18px', borderRadius: '6px',
            backgroundColor: '#fef2f2', color: '#991b1b',
            border: '1px solid #fecaca', marginBottom: '24px', fontWeight: 600,
          }}>
            ⚠ {loadError}
          </div>
        )}

        {message && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            marginBottom: '32px',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, #c9a22755)' }} />
            <span style={{
              color: '#0b1a33', fontWeight: 800, fontSize: '13px',
              letterSpacing: '1.5px', textTransform: 'uppercase',
              padding: '6px 20px',
              border: '1.5px solid #c9a227',
              borderRadius: '3px',
              background: '#f0efe9',
            }}>{message}</span>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, #c9a22755)' }} />
          </div>
        )}

        <div style={{ display: 'grid', gap: '40px', justifyItems: 'center' }}>
          {participants.map((person) => (
            <div key={person.id} style={{ width: '100%', maxWidth: '820px' }}>

              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                marginBottom: '12px', paddingLeft: '4px',
              }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#c9a227', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', fontWeight: 900, color: '#0b1a33', letterSpacing: '2.5px', textTransform: 'uppercase' }}>
                  登机牌 · {person.name}
                </span>
                <div style={{ flex: 1, height: '1px', background: '#c9a22733' }} />
              </div>

              <div style={{ borderRadius: '8px', boxShadow: '0 2px 0 #c9a22788, 0 12px 40px rgba(11,26,51,0.18)', overflow: 'hidden' }}>
                <BoardingPass person={person} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => downloadTicketAsPNG(person.id, person.name)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 36px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #0b1a33 0%, #1a3a6b 100%)',
                    color: '#c9a227',
                    fontWeight: 900,
                    fontSize: '13px',
                    cursor: 'pointer',
                    letterSpacing: '2.5px',
                    fontFamily: 'inherit',
                    borderRadius: '4px',
                    boxShadow: '0 2px 0 #c9a22799, 0 8px 24px rgba(11,26,51,0.3)',
                    textTransform: 'uppercase',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1v8M7 9l-3-3M7 9l3-3M1 11h12" stroke="#c9a227" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  下载 PNG
                </button>
              </div>
            </div>
          ))}
        </div>

        {participants.length === 0 && !loadError && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#0b1a3366', fontSize: '13px', letterSpacing: '1px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✈</div>
            <div style={{ fontWeight: 700 }}>在上方搜索姓名以生成登机牌</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TicketGenerator
