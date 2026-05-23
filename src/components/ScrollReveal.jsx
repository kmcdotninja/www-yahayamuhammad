import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './ScrollReveal.css'
import { useReducedMotion } from '../hooks/useReducedMotion.js'

gsap.registerPlugin(ScrollTrigger)

const PARAGRAPHS = [
  "I design for people often left out. I see design as a tool for opportunity, not decoration. I studied civil engineering but moved toward the human side of technology, connecting systems and people into simple experiences.",
  "I believe good products are built with empathy. I focus on making things that help people and care about growing young designers through access and mentorship.",
  "My work sits at the intersection of design and impact. This portfolio reflects curiosity, resilience, and purpose. It is only the beginning.",
]

const SIGNATURE_PATH =
  'M14.7848 5.42553C14.7697 5.41045 15.1451 5.66774 17.0731 7.37131C18.6548 8.769 21.3124 11.4138 23.4613 13.2276C25.6101 15.0414 27.1314 15.9863 28.3577 16.627C31.8712 18.4628 33.9358 18.1865 34.7255 18.0205C35.4959 17.8585 35.6282 14.3461 35.5468 9.52931C35.4954 6.48793 34.6139 4.62613 34.054 3.28903C33.7327 2.52179 33.2055 1.90145 32.5812 1.24219C32.3243 0.970796 32.0742 0.948749 31.799 1.07192C30.3883 1.70343 30.1089 4.51065 29.6596 9.48224C29.3535 12.8695 29.5385 18.0547 30.4084 23.7377C31.2783 29.4206 32.9936 35.4552 33.8977 37.7113C34.8018 39.9674 34.8427 38.2621 34.9772 36.9784C35.1987 34.8648 36.2348 32.9981 39.0458 29.4405C41.0925 26.8501 44.8089 23.0038 46.7832 20.764C49.0706 18.169 49.3158 17.2109 49.4713 16.353C49.6151 15.5603 49.3191 14.8459 48.8188 14.2757C47.7572 13.0661 45.3366 13.2564 42.6616 13.7232C41.3015 13.9605 40.5766 14.9577 40.0682 15.5351C39.4304 16.2594 39.1231 17.3724 38.9673 18.427C38.8449 19.2554 39.2019 19.9896 39.7322 20.6567C40.7131 21.8905 42.4354 21.8718 43.5644 21.7182C44.1517 21.6383 44.577 20.5767 45.1168 19.3996C46.6831 15.9837 46.0094 11.9307 45.9205 11.2257C45.8794 10.9005 45.7668 10.6541 45.6617 10.9006C45.2613 11.839 45.5037 13.2038 45.8453 14.1256C46.0821 14.7648 46.6088 15.2704 47.3279 15.7907C48.0777 16.3332 48.92 16.2361 49.4462 16.0296C50.1063 15.7707 50.4697 14.5379 50.8414 12.7387C51.3563 10.2463 51.0366 7.90788 50.7962 6.49832C50.6225 5.48006 49.9783 4.68722 49.3956 4.05943C49.1749 3.82171 48.9385 3.93776 48.8535 4.69193C48.7686 5.44609 48.7992 6.88334 49.6907 10.6782C50.5822 14.473 52.3336 20.5818 53.2979 23.8605C54.2621 27.1392 54.3862 27.4027 54.4945 27.3817C54.8755 27.3076 55.1442 23.7594 55.7732 18.9227C56.2944 14.9157 57.3756 13.4613 57.7875 13.2236C57.9886 13.1077 58.2148 13.0818 58.4785 13.2177C58.7423 13.3537 59.0473 13.6729 60.1162 16.8986C61.185 20.1243 63.0084 26.2469 63.9952 29.4995C64.9819 32.7521 65.0767 32.9493 65.1908 32.9646C65.3049 32.9798 65.4354 32.807 65.6367 30.8192C65.8381 28.8314 66.1063 25.0338 66.206 22.9567C66.3057 20.8796 66.2287 20.6381 66.1186 20.4353C65.9096 20.05 65.5268 19.8318 65.0963 19.6901C64.612 19.5308 64.0428 19.6599 63.5816 19.9515C63.1136 20.2475 63.2496 21.6086 63.3331 23.041C63.3798 23.8396 63.7925 24.2575 64.2002 24.6477C64.6451 25.0735 65.3522 25.1671 66.0463 25.1168C67.7917 24.9903 68.6232 22.7679 69.0817 21.5848C69.2999 21.0217 69.3384 20.473 69.4204 20.3317C70.5663 18.3562 72.4977 25.5838 74.2498 26.8054C74.9788 27.3137 75.7723 27.1722 76.2594 26.9354C76.7704 26.687 76.9664 25.749 77.3396 23.86C78.0546 20.241 78.0688 16.8657 78.0702 16.1492C78.0707 15.8681 78.0706 18.0205 78.6028 21.4088C79.135 24.7972 80.1993 29.9356 80.773 33.0076C81.5019 36.9112 81.3196 38.549 80.9204 39.9151C80.5589 41.1521 79.3582 41.7439 78.4162 42.1336C77.5408 42.4958 76.5875 42.3085 75.7392 41.9923C74.8195 41.6494 74.3369 40.4118 73.9707 39.014C73.5414 37.3756 74.4986 34.9727 76.0412 32.3569C76.7728 31.1163 77.6853 30.2313 79.5475 28.4664C81.4097 26.7014 84.2668 24.1292 85.8721 22.5791C87.8429 20.676 88.0583 19.8749 88.1114 19.3874C88.165 18.8958 87.9871 18.4485 87.7201 18.0863C87.4411 17.7079 86.9184 17.4593 86.2337 17.2046C85.2955 16.8555 84.3173 17.0736 83.6005 17.3398C81.874 17.9809 81.2006 19.5284 80.5236 21.1201C79.9792 22.3998 80.4507 23.5934 80.9222 24.1067C81.5224 24.7602 82.6602 24.668 83.6393 24.4989C86.1938 24.0577 87.7054 21.152 88.6401 19.0238C89.051 18.0882 88.7786 17.327 88.6164 17.1519C88.5553 17.0859 88.4236 17.3735 88.4285 19.3157C88.4335 21.2579 88.55 24.9246 88.6372 26.9025C88.7245 28.8804 88.7788 29.0584 88.9804 29.1252C89.5014 29.2978 90.7741 28.4081 92.4316 26.9808C94.0009 25.6295 94.8886 23.9136 95.7496 22.2775C96.7611 20.3555 97.3799 18.2231 97.7989 16.4645C98.3834 14.0115 97.971 12.5571 97.6755 12.2555C96.9103 11.4744 95.6167 11.6657 95.2777 11.8091C95.0931 11.8871 95.0351 12.2107 95.0361 14.1679C95.0372 16.1251 95.1379 19.7662 95.624 23.3988C96.1101 27.0314 96.9783 30.5452 97.4729 32.4344C97.9675 34.3236 98.0621 34.4817 98.1999 34.4559C98.3376 34.4301 98.5156 34.2155 99.0645 32.0648C99.6134 29.914 100.528 25.8335 101.003 23.5595C101.477 21.2855 101.485 20.9416 101.395 20.7303C101.241 20.3681 100.559 20.3793 99.8725 20.4161C98.6861 20.4796 97.7278 21.8413 96.7145 23.7915C96.5351 24.1369 97.1528 24.3157 97.575 24.3061C97.9971 24.2965 98.4046 24.138 99.8988 23.0669C101.393 21.9958 103.962 20.017 105.292 19.1101C106.623 18.2031 106.637 18.428 106.409 19.0424C105.8 20.689 104.914 22.9156 104.403 25.6146C104.127 27.0667 104.132 28.7367 104.049 28.4165C103.374 25.8286 103.872 22.304 104.172 20.3463C104.447 18.5486 105.58 16.9224 106.677 15.4691C107.509 14.367 108.521 14.0728 109.178 13.9857C109.475 13.9463 109.707 14.0825 109.911 14.4109C110.116 14.7393 110.289 15.2982 110.322 17.4637C110.355 19.6291 110.244 23.3843 110.127 25.7098C110.011 28.0353 109.893 28.8174 109.827 28.9875C109.717 29.2721 109.844 27.8194 110.805 25.6812C111.602 23.9071 113.273 20.8497 114.179 19.0482C115.085 17.2468 115.237 16.8233 115.781 18.5027C116.324 20.182 117.254 23.9768 117.797 25.8007C118.341 27.6246 118.468 27.3625 118.79 24.5839C119.111 21.8053 119.623 16.5182 119.767 13.8621C119.912 11.206 119.675 11.3413 119.303 11.6476C118.401 12.391 117.633 13.437 117.155 14.5505C116.653 15.7169 116.751 17.397 116.793 19.2381C116.867 22.4806 119.257 25.1889 120.306 26.083C120.415 26.1758 120.567 25.8966 120.629 25.4607C120.692 25.0248 120.692 24.3121 101.065 25.2589C81.4387 26.2058 42.1854 28.8337 21.865 30.1838C1.54463 31.5339 1.34676 31.5266 1.00024 31.4713'

// Split into tokens, preserving whitespace so spacing survives the word-wrap.
function tokens(text) {
  return text.split(/(\s+)/)
}

export default function ScrollReveal() {
  const rootRef = useRef(null)
  const signatureWrapRef = useRef(null)
  const pathRef = useRef(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    // Reduced motion: skip animations entirely, render everything in final state.
    if (reduced) {
      root.querySelectorAll('.sr__word').forEach((el) => {
        el.style.opacity = '1'
      })
      if (signatureWrapRef.current) {
        signatureWrapRef.current.style.opacity = '1'
      }
      if (pathRef.current) {
        pathRef.current.style.strokeDasharray = 'none'
        pathRef.current.style.strokeDashoffset = '0'
      }
      return
    }

    const ctx = gsap.context(() => {
      // Word-by-word opacity scrub across the paragraphs block.
      const words = root.querySelectorAll('.sr__word')
      const paragraphs = root.querySelector('.sr__paragraphs')

      gsap.to(words, {
        opacity: 1,
        ease: 'none',
        stagger: 0.5,
        scrollTrigger: {
          trigger: paragraphs,
          start: 'top 75%',
          end: 'bottom 80%',
          scrub: 0.6,
        },
      })

      // Signature stroke draw fires when the signature enters view.
      const path = pathRef.current
      const wrap = signatureWrapRef.current
      if (path && wrap) {
        const length = path.getTotalLength()
        gsap.set(path, {
          strokeDasharray: length,
          strokeDashoffset: length,
        })

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: wrap,
            start: 'top 82%',
            toggleActions: 'play none none reverse',
          },
        })
        tl.to(wrap, { opacity: 1, duration: 0.4, ease: 'power2.out' })
        tl.to(
          path,
          {
            strokeDashoffset: length * 0.55,
            duration: 1.2,
            ease: 'power2.inOut',
          },
          '<',
        )
        tl.to(path, {
          strokeDashoffset: 0,
          duration: 1.05,
          ease: 'power1.out',
        })
      }

      ScrollTrigger.refresh()
    }, rootRef)

    return () => ctx.revert()
  }, [reduced])

  return (
    <section ref={rootRef} className="sr">
      <div className="sr__paragraphs">
        {PARAGRAPHS.map((p, pi) => (
          <p key={pi} className="sr__paragraph">
            {tokens(p).map((tok, ti) =>
              /\S/.test(tok) ? (
                <span key={ti} className="sr__word">
                  {tok}
                </span>
              ) : (
                tok
              ),
            )}
          </p>
        ))}
      </div>

      <div ref={signatureWrapRef} className="sr__sign">
        <span className="sr__name">Yahaya Muhammad</span>
        <svg
          width="244"
          height="88"
          viewBox="0 0 122 44"
          fill="none"
          aria-hidden="true"
          className="sr__sig"
        >
          <path
            ref={pathRef}
            d={SIGNATURE_PATH}
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    </section>
  )
}
