import { useEffect } from 'react'
import './NotePage.css'
import TopNav from './TopNav.jsx'
import ScrollReveal from './ScrollReveal.jsx'
import Footer from './Footer.jsx'

export default function NotePage() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <>
      <TopNav />

      <main className="note">
        <ScrollReveal />
      </main>

      <Footer />
    </>
  )
}
