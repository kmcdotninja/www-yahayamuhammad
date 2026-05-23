import { useEffect, useState } from 'react'
import './Clock.css'

function format(date) {
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

function getZoneLabel() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const city = tz.split('/').pop().replace(/_/g, ' ')
    return city
  } catch {
    return 'LOCAL'
  }
}

export default function Clock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="clock" aria-label="local time">
      <span className="clock__dot" />
      <span className="clock__time">{format(now)}</span>
      <span className="clock__zone">{getZoneLabel()}</span>
    </div>
  )
}
