import './App.css'
import Hero from './components/Hero.jsx'
import Works from './components/Works.jsx'
import PlaygroundPage from './components/PlaygroundPage.jsx'
import Footer from './components/Footer.jsx'
import { useScrollAnimations } from './hooks/useScrollAnimations.js'
import { usePathname } from './lib/router.js'

export default function App() {
  useScrollAnimations()
  const pathname = usePathname()

  return (
    <div className="page">
      {pathname === '/playground' ? (
        <PlaygroundPage />
      ) : (
        <>
          <Hero />
          <Works />
          <Footer />
        </>
      )}
    </div>
  )
}
