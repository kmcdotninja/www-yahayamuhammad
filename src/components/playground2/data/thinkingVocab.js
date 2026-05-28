export const VOCAB = {
  calm: [
    'thinking', 'noting', 'tracing', 'weighing', 'settling', 'scanning',
    'observing', 'sensing', 'holding', 'considering', 'aligning', 'drawing',
  ],
  intense: [
    'expanding', 'pruning', 'compiling', 'scoring', 'compressing', 'drilling',
    'rebalancing', 'challenging', 'exhausting', 'triangulating', 'testing', 'forcing',
  ],
  analytical: [
    'decomposing', 'mapping', 'evaluating', 'checking', 'ranking', 'isolating',
    'deriving', 'normalizing', 'auditing', 'partitioning', 'formalizing', 'parsing',
  ],
  creative: [
    'wandering', 'rotating', 'remixing', 'borrowing', 'sketching', 'playing',
    'following', 'chasing', 'reframing', 'finding', 'shaping', 'blending',
  ],
}

export const MODES = {
  calm:       { interval: [950, 1600], maxLines: 6, accent: '#cbd5e1' },
  intense:    { interval: [220, 460],  maxLines: 9, accent: '#fb923c' },
  analytical: { interval: [620, 980],  maxLines: 7, accent: '#67e8f9' },
  creative:   { interval: [480, 1150], maxLines: 8, accent: '#c4b5fd' },
}
