import { useEffect } from 'react'
import './AboutPage.css'
import TopNav from './TopNav.jsx'
import ScrollReveal from './ScrollReveal.jsx'
import Footer from './Footer.jsx'

export default function AboutPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <>
      <TopNav />

      <main className="about">
        <h1 className="sr-only">
          About Yahaya Muhammad — Product Designer & UX Designer based in Nigeria
        </h1>
        <ScrollReveal />
      </main>

      <Footer />
    </>
  )
}
