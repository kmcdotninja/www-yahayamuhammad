import './App.css'
import Hero from './components/Hero.jsx'
import Works from './components/Works.jsx'
import PlaygroundPage from './components/PlaygroundPage.jsx'
import NotePage from './components/NotePage.jsx'
import Footer from './components/Footer.jsx'
import { useScrollAnimations } from './hooks/useScrollAnimations.js'
import { usePathname } from './lib/router.js'

export default function App() {
  const pathname = usePathname()
  useScrollAnimations(pathname)

  let body
  if (pathname === '/playground') {
    body = <PlaygroundPage />
  } else if (pathname === '/note') {
    body = <NotePage />
  } else {
    body = (
      <>
        <Hero />
        <Works />
        <Footer />
      </>
    )
  }

  return <div className="page">{body}</div>
}
