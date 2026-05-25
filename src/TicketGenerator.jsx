import { useState } from 'react'
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
      alert('图片生成失败')
    }
  }

  const colors = {
    primary: '#2563eb',
    textMain: '#0f172a',
    textMuted: '#64748b',
    border: '#dbe4f0',
    premiumBg: '#0f172a',
    premiumAccent: '#facc15',
    standardBg: '#ffffff',
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', padding: '24px 20px 40px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <p style={{ margin: 0, color: colors.primary, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.1px', fontSize: '12px' }}>
            2026 下半年欢送会
          </p>
          <h1 style={{ margin: '10px 0 8px', fontSize: 'clamp(2rem, 3vw, 2.5rem)', color: colors.textMain }}>机票生成器</h1>
          <p style={{ margin: '0 auto', maxWidth: '720px', color: colors.textMuted, lineHeight: 1.7 }}>
            输入参与者姓名，系统会直接从 Supabase 查询并生成对应的登机牌。
          </p>
        </div>

        {loadError && (
          <div style={{ padding: '16px 18px', borderRadius: '14px', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', marginBottom: '20px' }}>
            {loadError}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: '12px',
            marginBottom: '24px',
            padding: '18px',
            borderRadius: '20px',
            backgroundColor: colors.standardBg,
            border: `1px solid ${colors.border}`,
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.06)',
          }}
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                searchParticipants()
              }
            }}
            placeholder="请输入姓名"
            style={{
              border: 'none',
              outline: 'none',
              fontSize: '16px',
              padding: '10px 4px',
              color: colors.textMain,
              backgroundColor: 'transparent',
            }}
          />
          <button
            type="button"
            onClick={searchParticipants}
            disabled={isSearching}
            style={{
              padding: '12px 18px',
              borderRadius: '999px',
              border: 'none',
              backgroundColor: colors.primary,
              color: '#ffffff',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {isSearching ? '查询中...' : '搜索'}
          </button>
        </div>

        <p style={{ margin: '0 0 18px', color: colors.textMuted, fontWeight: 700 }}>{message}</p>

        <div style={{ display: 'grid', gap: '28px', justifyItems: 'center' }}>
          {participants.map((person) => {
            const isGraduate = person.type === 'graduate'
            const seat = formatSeat(person.group_num)
            const qrData = {
              id: person.id,
              name: person.name,
              seat,
              flight: FLIGHT_NO,
              time: TIME,
              destination: ROUTE,
              class: isGraduate ? 'business' : 'economy',
            }

            return (
              <div
                key={person.id}
                style={{
                  width: '100%',
                  maxWidth: '760px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  id={`ticket-${person.id}`}
                  style={{
                    width: '100%',
                    minHeight: '240px',
                    borderRadius: '22px',
                    display: 'flex',
                    overflow: 'hidden',
                    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.12)',
                    backgroundColor: isGraduate ? colors.premiumBg : colors.standardBg,
                    color: isGraduate ? '#ffffff' : colors.textMain,
                    border: `1px solid ${isGraduate ? '#1e293b' : colors.border}`,
                  }}
                >
                  <div style={{ flex: 1, padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          backgroundColor: isGraduate ? 'rgba(250, 204, 21, 0.16)' : '#eff6ff',
                          color: isGraduate ? colors.premiumAccent : colors.primary,
                          fontWeight: 800,
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.7px',
                          marginBottom: '12px',
                        }}
                      >
                        {isGraduate ? '黑金票' : '白蓝票'}
                      </span>
                      <h3 style={{ margin: 0, fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px' }}>
                        {person.name}
                      </h3>
                    </div>

                    <div style={{ display: 'flex', gap: '28px', marginTop: '24px' }}>
                      {[
                        ['Flight', FLIGHT_NO],
                        ['Seat', seat],
                        ['Time', TIME],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: isGraduate ? '#cbd5e1' : colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                            {label}
                          </p>
                          <p style={{ margin: '6px 0 0', fontSize: '20px', fontWeight: 900 }}>{value}</p>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: `1px solid ${isGraduate ? '#334155' : colors.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: isGraduate ? '#cbd5e1' : colors.textMuted }}>
                          <strong>Route:</strong> {ROUTE}
                        </p>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: isGraduate ? '#cbd5e1' : colors.textMuted }}>
                          Graduation Ceremony
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      width: '210px',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isGraduate ? '#111827' : '#f8fafc',
                      borderLeft: `2px dashed ${isGraduate ? '#334155' : '#cbd5e1'}`,
                    }}
                  >
                    <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <QRCodeCanvas value={JSON.stringify(qrData)} size={120} level="H" />
                    </div>
                    <p style={{ margin: '16px 0 0', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.7px', color: isGraduate ? '#cbd5e1' : colors.textMuted }}>
                      Scan to Board
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => downloadTicketAsPNG(person.id, person.name)}
                  style={{
                    padding: '11px 22px',
                    borderRadius: '999px',
                    border: 'none',
                    backgroundColor: colors.primary,
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 10px 22px rgba(37, 99, 235, 0.2)',
                  }}
                >
                  下载 PNG
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default TicketGenerator