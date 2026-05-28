import { useEffect } from 'react'
import './PlaygroundPage.css'
import Footer from './Footer.jsx'
import TopNav from './TopNav.jsx'
// Playground 1 (tilt-card image grid) is parked. Files kept around so we
// can bring it back later — flip the import + render below to revive it.
// eslint-disable-next-line no-unused-vars
import Playground from './Playground.jsx'

import PlaygroundSection from './playground2/PlaygroundSection.jsx'
import StickerStack from './playground2/interactions/StickerStack.jsx'
import ImageZoomStory from './playground2/interactions/ImageZoomStory.jsx'
import NumberFlipCounter from './playground2/interactions/NumberFlipCounter.jsx'
import AppleCarousel from './playground2/interactions/AppleCarousel.jsx'
import ThinkingStream from './playground2/interactions/ThinkingStream.jsx'
import { kmcStickers } from './playground2/data/kmcStickers.js'
import { carImage, carScenes } from './playground2/data/carScenes.js'
import { carouselCards } from './playground2/data/carouselCards.jsx'

export default function PlaygroundPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <>
      <TopNav />

      <main className="pgp">
        <header className="pgp__head" data-reveal>
          <h1 className="pgp__title">
            <span className="sr-only">
              Yahaya Muhammad’s Playground —{' '}
            </span>
            Bits I make
            <br />
            between projects
          </h1>
          <p className="pgp__sub">
            Small experiments in illustrations, code, and interaction design.
          </p>
        </header>

        <div className="pgp__demos">
          <PlaygroundSection title="Sticker Stack" meta="Drag · Spring" aspect="wide">
            {({ inView }) => (
              /* Entry ≈ 1.7 s, so loopDelay 2300 ms gives a 4 s replay cycle. */
              <StickerStack
                stickers={kmcStickers}
                play={inView}
                loop
                loopDelay={2300}
              />
            )}
          </PlaygroundSection>

          <PlaygroundSection title="Image Zoom Story" meta="Camera · Zoom" aspect="wide">
            {() => <ImageZoomStory image={carImage} scenes={carScenes} autoPlay loop />}
          </PlaygroundSection>

          <PlaygroundSection title="Number Flip Counter" meta="Spring · Roll" aspect="wide">
            {() => <NumberFlipCounter value={0} maxDigits={4} autoPlay duration={0.6} />}
          </PlaygroundSection>

          <PlaygroundSection title="Apple Carousel" meta="Drag · Snap" aspect="wide">
            {() => <AppleCarousel items={carouselCards} autoPlay loop showControls showDots />}
          </PlaygroundSection>

          <PlaygroundSection title="Thinking Stream" meta="Scramble · Loop" aspect="wide">
            {({ inView }) => (
              <ThinkingStream active={inView} mode="analytical" accentColor="#37D15D" />
            )}
          </PlaygroundSection>
        </div>
      </main>

      <Footer />
    </>
  )
}
