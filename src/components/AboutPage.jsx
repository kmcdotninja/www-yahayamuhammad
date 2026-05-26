import { useEffect } from 'react'
import './AboutPage.css'
import TopNav from './TopNav.jsx'
import ScrollReveal from './ScrollReveal.jsx'
// Sticker playground parked for now — keep the component and its CSS
// around so we can drop <Stickers /> back into the layout later.
// eslint-disable-next-line no-unused-vars
import Stickers from './Stickers.jsx'
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
