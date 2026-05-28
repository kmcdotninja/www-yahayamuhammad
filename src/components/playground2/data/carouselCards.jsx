const img = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=80&bri=8&sat=8`

const cards = [
  { title: 'Tropical Shore', url: img('photo-1507525428034-b723cf961d3e') },
  { title: 'Emerald Lake',   url: img('photo-1506744038136-46273834b3fb') },
  { title: 'Forest Lake',    url: img('photo-1501785888041-af3ef285b470') },
  { title: 'Still Water',    url: img('photo-1470770841072-f978cf4d019e') },
  { title: 'Turquoise Bay',  url: img('photo-1505144808419-1957a94ca61e') },
]

export const carouselCards = cards.map((c) => (
  <img
    key={c.url}
    src={c.url}
    alt={c.title}
    draggable={false}
    loading="lazy"
  />
))
