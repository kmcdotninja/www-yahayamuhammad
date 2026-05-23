import './Playground.css'
import { playground } from '../data.js'

export default function Playground() {
  return (
    <div className="pg__feed" data-reveal-stagger>
      {playground.map((src, i) => (
        <figure key={i} className="pg__card">
          <img
            src={src}
            alt=""
            className="pg__img"
            loading="lazy"
            draggable={false}
          />
        </figure>
      ))}
    </div>
  )
}
