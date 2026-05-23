import { useEffect, useState } from 'react'
import './CopyToast.css'

const EXIT_MS = 520

export default function CopyToast({ visible }) {
  const [stage, setStage] = useState('hidden')

  useEffect(() => {
    if (visible) {
      setStage('visible')
      return
    }
    let id
    setStage((current) => {
      if (current === 'visible') {
        id = setTimeout(() => setStage('hidden'), EXIT_MS)
        return 'exiting'
      }
      return current
    })
    return () => id && clearTimeout(id)
  }, [visible])

  const cls = [
    'copy-toast',
    stage === 'visible' && 'copy-toast--visible',
    stage === 'exiting' && 'copy-toast--exiting',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={cls}
      aria-live="polite"
      aria-hidden={stage !== 'visible'}
    >
      <h3 className="copy-toast__title">You just copied my email</h3>
      <img
        src="/Mailbox.png"
        alt=""
        aria-hidden="true"
        className="copy-toast__image"
      />
    </div>
  )
}
