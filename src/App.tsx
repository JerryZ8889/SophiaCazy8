import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
type Card = { suit: Suit; rank: number; id: string }

const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
const suitSymbols: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
}
const confettiPalette = [
  '#f43f5e',
  '#fb7185',
  '#facc15',
  '#38bdf8',
  '#a78bfa',
  '#34d399',
]

const buildConfettiPieces = () =>
  Array.from({ length: 40 }).map((_, index) => ({
    id: `confetti-${index}`,
    left: `${Math.random() * 100}%`,
    color: confettiPalette[index % confettiPalette.length],
    duration: 2.4 + (index % 5) * 0.35,
    delay: (index % 10) * 0.15,
  }))

const suitColorOnLight = (suit: Suit) =>
  suit === 'hearts' || suit === 'diamonds' ? 'text-rose-600' : 'text-slate-900'
const suitColorOnDark = (suit: Suit) =>
  suit === 'hearts' || suit === 'diamonds' ? 'text-rose-400' : 'text-white'

const suitHoverBorder: Record<Suit, string> = {
  hearts: 'hover:border-rose-400/60',
  diamonds: 'hover:border-rose-400/60',
  clubs: 'hover:border-emerald-400/60',
  spades: 'hover:border-sky-400/60',
}
const suitHoverBg: Record<Suit, string> = {
  hearts: 'hover:bg-rose-500/15',
  diamonds: 'hover:bg-rose-500/15',
  clubs: 'hover:bg-emerald-500/15',
  spades: 'hover:bg-sky-500/15',
}

const rankLabel = (rank: number) => {
  if (rank === 1) return 'A'
  if (rank === 11) return 'J'
  if (rank === 12) return 'Q'
  if (rank === 13) return 'K'
  return `${rank}`
}

const shuffle = <T,>(list: T[]) => {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const createDeck = () => {
  const deck: Card[] = []
  suits.forEach((suit) => {
    for (let rank = 1; rank <= 13; rank += 1) {
      deck.push({ suit, rank, id: `${suit}-${rank}-${crypto.randomUUID()}` })
    }
  })
  return deck
}

function App() {
  const [screen, setScreen] = useState<'welcome' | 'game' | 'over'>('welcome')
  const [deck, setDeck] = useState<Card[]>([])
  const [discard, setDiscard] = useState<Card[]>([])
  const [playerHand, setPlayerHand] = useState<Card[]>([])
  const [aiHand, setAiHand] = useState<Card[]>([])
  const [currentSuit, setCurrentSuit] = useState<Suit | null>(null)
  const [turn, setTurn] = useState<'player' | 'ai'>('player')
  const [pendingSuit, setPendingSuit] = useState(false)
  const [winner, setWinner] = useState<'player' | 'ai' | null>(null)
  const [message, setMessage] = useState('')
  const [rulesOpen, setRulesOpen] = useState(false)
  const winSoundPlayedRef = useRef(false)

  const topCard = discard[discard.length - 1]
  const activeSuit = currentSuit ?? topCard?.suit ?? 'hearts'

  const isPlayable = useCallback(
    (card: Card) => {
      if (!topCard) return true
      if (card.rank === 8) return true
      return card.suit === activeSuit || card.rank === topCard.rank
    },
    [activeSuit, topCard],
  )

  const playerPlayable = useMemo(
    () => playerHand.filter(isPlayable),
    [playerHand, isPlayable],
  )

  const startGame = () => {
    const newDeck = shuffle(createDeck())
    const player = newDeck.splice(0, 8)
    const ai = newDeck.splice(0, 8)
    const firstDiscard = newDeck.splice(0, 1)
    const firstTop = firstDiscard[0]
    setDeck(newDeck)
    setPlayerHand(player)
    setAiHand(ai)
    setDiscard(firstDiscard)
    setCurrentSuit(firstTop?.suit ?? null)
    setTurn('player')
    setPendingSuit(false)
    setWinner(null)
    setMessage('Your turn')
    setScreen('game')
  }

  const recycleDeck = useCallback(
    (currentDeck: Card[], currentDiscard: Card[]) => {
      if (currentDeck.length > 0) return { deck: currentDeck, discard: currentDiscard }
      if (currentDiscard.length <= 1) return { deck: currentDeck, discard: currentDiscard }
      const top = currentDiscard[currentDiscard.length - 1]
      const recycled = shuffle(currentDiscard.slice(0, -1))
      return { deck: recycled, discard: [top] }
    },
    [],
  )

  const finishIfWin = useCallback(
    (handLength: number, who: 'player' | 'ai') => {
      if (handLength === 0) {
        setWinner(who)
        setScreen('over')
        return true
      }
      return false
    },
    [],
  )

  const playCard = (card: Card) => {
    if (screen !== 'game' || turn !== 'player' || pendingSuit) return
    if (!isPlayable(card)) return
    const nextHand = playerHand.filter((c) => c.id !== card.id)
    const nextDiscard = [...discard, card]
    setPlayerHand(nextHand)
    setDiscard(nextDiscard)
    if (finishIfWin(nextHand.length, 'player')) return
    if (card.rank === 8) {
      setPendingSuit(true)
      setCurrentSuit(null)
      setMessage('Choose a suit')
      return
    }
    setCurrentSuit(card.suit)
    setTurn('ai')
    setMessage('AI is thinking...')
  }

  const drawCard = () => {
    if (screen !== 'game' || turn !== 'player' || pendingSuit) return
    if (playerPlayable.length > 0) return
    const { deck: availDeck, discard: newDiscard } = recycleDeck(deck, discard)
    if (availDeck.length === 0) {
      setTurn('ai')
      setMessage('No cards left, skipping')
      return
    }
    const nextCard = availDeck[0]
    setDeck(availDeck.slice(1))
    setDiscard(newDiscard)
    setPlayerHand([...playerHand, nextCard])
    setTurn('ai')
    setMessage('You drew a card')
  }

  const chooseSuit = (suit: Suit) => {
    if (!pendingSuit) return
    setCurrentSuit(suit)
    setPendingSuit(false)
    setTurn('ai')
    setMessage('AI is thinking...')
  }

  useEffect(() => {
    if (screen !== 'game' || turn !== 'ai' || pendingSuit || winner) return
    const timer = setTimeout(() => {
      const playable = aiHand.filter(isPlayable)
      if (playable.length === 0) {
        const { deck: availDeck, discard: newDiscard } = recycleDeck(deck, discard)
        if (availDeck.length === 0) {
          setTurn('player')
          setMessage('AI skipped')
          return
        }
        const nextCard = availDeck[0]
        setDeck(availDeck.slice(1))
        setDiscard(newDiscard)
        setAiHand([...aiHand, nextCard])
        setTurn('player')
        setMessage('AI drew a card')
        return
      }
      const nonWild = playable.find((card) => card.rank !== 8)
      const chosen = nonWild ?? playable[0]
      const nextHand = aiHand.filter((c) => c.id !== chosen.id)
      const nextDiscard = [...discard, chosen]
      setAiHand(nextHand)
      setDiscard(nextDiscard)
      if (finishIfWin(nextHand.length, 'ai')) return
      if (chosen.rank === 8) {
        const suitCounts = suits.map((suit) => ({
          suit,
          count: nextHand.filter((c) => c.suit === suit).length,
        }))
        suitCounts.sort((a, b) => b.count - a.count)
        setCurrentSuit(suitCounts[0]?.suit ?? 'hearts')
      } else {
        setCurrentSuit(chosen.suit)
      }
      setTurn('player')
      setMessage('Your turn')
    }, 650)
    return () => clearTimeout(timer)
  }, [
    aiHand,
    deck,
    discard,
    pendingSuit,
    screen,
    turn,
    winner,
    activeSuit,
    topCard,
    finishIfWin,
    isPlayable,
    recycleDeck,
  ])

  const [confettiPieces] = useState(buildConfettiPieces)
  const statusText = useMemo(() => {
    if (screen === 'welcome') return ''
    if (screen === 'over') {
      return winner === 'player' ? 'You win!' : 'AI wins'
    }
    if (pendingSuit) return 'Play an 8 and choose a suit'
    return message || (turn === 'player' ? 'Your turn' : 'AI turn')
  }, [message, pendingSuit, screen, turn, winner])

  const suitBadge = suitSymbols[activeSuit]

  useEffect(() => {
    if (screen !== 'over') {
      winSoundPlayedRef.current = false
      return
    }
    if (winner !== 'player' || winSoundPlayedRef.current) return
    winSoundPlayedRef.current = true
    const AudioContextRef =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    if (!AudioContextRef) return
    const audioContext = new AudioContextRef()
    const now = audioContext.currentTime
    const main = audioContext.createOscillator()
    const accent = audioContext.createOscillator()
    const gain = audioContext.createGain()
    main.type = 'triangle'
    accent.type = 'sine'
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2)
    main.frequency.setValueAtTime(523.25, now)
    main.frequency.exponentialRampToValueAtTime(783.99, now + 0.6)
    accent.frequency.setValueAtTime(659.25, now + 0.1)
    accent.frequency.exponentialRampToValueAtTime(987.77, now + 0.8)
    main.connect(gain)
    accent.connect(gain)
    gain.connect(audioContext.destination)
    main.start(now)
    accent.start(now + 0.08)
    main.stop(now + 1.2)
    accent.stop(now + 1.2)
    setTimeout(() => audioContext.close(), 1500)
  }, [screen, winner])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.25),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(244,114,182,0.2),_transparent_55%),linear-gradient(135deg,_#0f172a,_#020617)] text-white">
      {screen === 'welcome' && (
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-10 text-center shadow-2xl backdrop-blur">
            <div className="mx-auto w-full max-w-lg">
              <p className="text-xs uppercase tracking-[0.4em] text-indigo-200">
                Welcome to
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[0.08em] sm:text-6xl">
                SOPHIA’S CRAZY 8
              </h1>
              <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-indigo-400/70" />
              <p className="mt-5 text-base text-indigo-100 sm:text-lg">
                Match suit or rank, play an 8 to change suit, and be first to
                empty your hand.
              </p>
            </div>
            <button
              className="mt-10 w-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-500 px-8 py-4 text-lg font-semibold shadow-xl shadow-indigo-500/40 transition hover:-translate-y-0.5 hover:shadow-indigo-500/70 active:scale-95"
              onClick={startGame}
            >
              Start Game
            </button>
          </div>
        </div>
      )}

      {screen !== 'welcome' && (
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-indigo-200">
                Card Game
              </p>
              <h2 className="text-2xl font-semibold">Sophia’s Crazy 8</h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 shadow-md transition hover:border-white/40 hover:bg-white/10"
                onClick={() => setRulesOpen(true)}
              >
                Rules
              </button>
              <button
                className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 shadow-md transition hover:border-white/40 hover:bg-white/10"
                onClick={startGame}
              >
                Restart
              </button>
              <button
                className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 shadow-md transition hover:border-white/40 hover:bg-white/10"
                onClick={() => setScreen('welcome')}
              >
                Back to Welcome
              </button>
            </div>
          </header>

          <section className="mt-6 flex flex-1 flex-col justify-between gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-indigo-200">AI Hand</p>
                  <p className="text-lg font-semibold">{aiHand.length} cards</p>
                </div>
                <div className="flex gap-2">
                  {Array.from({ length: Math.min(aiHand.length, 8) }).map(
                    (_, index) => (
                      <div
                        key={`ai-${index}`}
                        className="relative h-12 w-8 rounded-lg border border-white/20 bg-[linear-gradient(140deg,_rgba(99,102,241,0.55),_rgba(15,23,42,0.95))] shadow-md"
                      >
                        <div className="absolute inset-1 rounded-md border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.3),_transparent_60%)]" />
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-semibold uppercase tracking-[0.2em] text-white/80">
                          AI
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
                <p className="text-xs text-indigo-200">Status</p>
                <p className="mt-1 text-lg font-semibold">
                  {statusText}
                  {turn === 'ai' && screen === 'game' && !winner && (
                    <span className="ml-2 inline-flex gap-1 align-middle text-indigo-300">
                      <span className="thinking-dot" />
                      <span className="thinking-dot" />
                      <span className="thinking-dot" />
                    </span>
                  )}
                </p>
                <div className="mt-4 flex items-center gap-3 text-sm text-indigo-100">
                  <span>Current suit</span>
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/10 text-xl ${suitColorOnDark(
                      activeSuit,
                    )}`}
                  >
                    {suitBadge}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-white/70">
                  <span>Top discard</span>
                  {topCard ? (
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-white">
                      <span className={suitColorOnDark(topCard.suit)}>
                        {suitSymbols[topCard.suit]}
                      </span>{' '}
                      {rankLabel(topCard.rank)}
                    </span>
                  ) : (
                    <span className="text-white/50">None</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-center gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
                <div className="relative">
                  {deck.length > 1 && (
                    <>
                      <div className="absolute -top-1 left-1 h-28 w-20 rounded-2xl border border-white/10 bg-slate-800/60" />
                      <div className="absolute -top-0.5 left-0.5 h-28 w-20 rounded-2xl border border-white/15 bg-slate-800/80" />
                    </>
                  )}
                  <button
                    className={`group relative flex h-28 w-20 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-slate-800 to-slate-900 shadow-xl transition ${
                      playerPlayable.length === 0 &&
                      turn === 'player' &&
                      !pendingSuit
                        ? 'hover:-translate-y-1 hover:border-white/40 hover:shadow-2xl'
                        : 'cursor-not-allowed opacity-60'
                    }`}
                    onClick={drawCard}
                  >
                    <span className="text-sm font-semibold text-white/80">
                      Draw
                    </span>
                    <span className="absolute bottom-2 text-[10px] text-white/40">
                      {deck.length} left
                    </span>
                  </button>
                </div>

                <div className="relative flex h-32 w-24 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-xl">
                  {topCard ? (
                    <div className="flex h-28 w-20 flex-col items-center justify-center rounded-xl bg-white text-slate-900 shadow-lg">
                      <span
                        className={`text-3xl ${suitColorOnLight(
                          topCard.suit,
                        )}`}
                      >
                        {suitSymbols[topCard.suit]}
                      </span>
                      <span className="text-xl font-semibold">
                        {rankLabel(topCard.rank)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-white/40">Discard</span>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur">
              <p className="text-xs text-indigo-200">Your Hand</p>
              <div className="hand-scroll mt-3 flex gap-3 overflow-x-auto pb-2">
                {playerHand.map((card, index) => {
                  const playable = isPlayable(card)
                  const canAct = playable && turn === 'player' && !pendingSuit
                  const isWild = card.rank === 8
                  return (
                    <button
                      key={card.id}
                      className={`card-enter relative flex h-24 w-16 flex-shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl border bg-white text-slate-900 shadow-md transition-all duration-200 ${
                        canAct
                          ? 'card-playable border-indigo-400 hover:-translate-y-2 hover:shadow-lg active:scale-95'
                          : 'cursor-not-allowed border-slate-200 opacity-50'
                      }`}
                      style={{ animationDelay: `${index * 0.04}s` }}
                      onClick={() => playCard(card)}
                    >
                      <span className="absolute -left-3 top-2 rotate-12 text-6xl opacity-10">
                        {suitSymbols[card.suit]}
                      </span>
                      <span className="absolute -bottom-6 right-2 text-6xl opacity-10">
                        {suitSymbols[card.suit]}
                      </span>
                      <span
                        className={`text-2xl ${suitColorOnLight(card.suit)}`}
                      >
                        {suitSymbols[card.suit]}
                      </span>
                      <span className={`text-base font-semibold ${isWild ? 'wild-badge' : ''}`}>
                        {rankLabel(card.rank)}
                      </span>
                      {isWild && (
                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-[8px] font-bold text-white shadow">
                          W
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>
        </div>
      )}

      {pendingSuit && screen === 'game' && (
        <div className="modal-backdrop fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="modal-content w-full max-w-md rounded-3xl border border-white/20 bg-slate-900/90 p-6 text-center shadow-2xl backdrop-blur">
            <h3 className="text-xl font-semibold">Choose a suit</h3>
            <div className="mt-6 grid grid-cols-2 gap-4">
              {suits.map((suit) => (
                <button
                  key={suit}
                  className={`flex flex-col items-center justify-center rounded-2xl border border-white/20 bg-white/10 py-4 text-lg font-semibold transition active:scale-95 ${suitHoverBorder[suit]} ${suitHoverBg[suit]}`}
                  onClick={() => chooseSuit(suit)}
                >
                  <span
                    className={`text-3xl ${suitColorOnDark(suit)}`}
                  >
                    {suitSymbols[suit]}
                  </span>
                  <span className="mt-2 text-sm text-white/80">
                    {suit === 'hearts'
                      ? 'Hearts'
                      : suit === 'diamonds'
                        ? 'Diamonds'
                        : suit === 'clubs'
                          ? 'Clubs'
                          : 'Spades'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {rulesOpen && screen !== 'welcome' && (
        <div
          className="modal-backdrop fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setRulesOpen(false)}
        >
          <div
            className="modal-content w-full max-w-2xl rounded-3xl border border-white/20 bg-slate-900/90 p-8 text-left shadow-2xl backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold">Rules</h3>
              <button
                className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 shadow-md transition hover:border-white/40 hover:bg-white/10"
                onClick={() => setRulesOpen(false)}
              >
                Close
              </button>
            </div>
            <ul className="mt-6 space-y-3 text-sm text-white/80">
              <li>Each player starts with 8 cards.</li>
              <li>Play a card that matches suit or rank on the discard.</li>
              <li>Any 8 is wild and lets you choose a new suit.</li>
              <li>If you cannot play, draw one card. If the deck is empty, skip.</li>
              <li>The first player to empty their hand wins.</li>
            </ul>
          </div>
        </div>
      )}

      {screen === 'over' && winner && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
          {winner === 'player' && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {confettiPieces.map((piece) => (
                <span
                  key={piece.id}
                  className="absolute h-3 w-2 rounded-sm"
                  style={{
                    left: piece.left,
                    backgroundColor: piece.color,
                    animation: `confetti-fall ${piece.duration}s linear infinite`,
                    animationDelay: `${piece.delay}s`,
                  }}
                />
              ))}
            </div>
          )}
          <div className="modal-content relative w-full max-w-lg rounded-3xl border border-white/20 bg-slate-900/90 p-10 text-center shadow-2xl backdrop-blur">
            <p className="text-xs uppercase tracking-[0.35em] text-indigo-200">
              Game Over
            </p>
            {winner === 'player' ? (
              <h2 className="mt-4 text-5xl font-extrabold text-red-500">
                YOU WIN!
              </h2>
            ) : (
              <h2 className="mt-4 text-4xl font-semibold text-sky-300">
                AI WINS
              </h2>
            )}
            <p className="mt-4 text-white/70">
              {winner === 'player'
                ? 'Fantastic play! Ready for another round?'
                : 'Nice try! Want to play again?'}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                className="rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-500 px-6 py-3 text-sm font-semibold shadow-lg shadow-indigo-500/40 transition hover:-translate-y-0.5 hover:shadow-indigo-500/70 active:scale-95"
                onClick={startGame}
              >
                Play Again
              </button>
              <button
                className="rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white/90 shadow-md transition hover:border-white/40 hover:bg-white/10"
                onClick={() => setScreen('welcome')}
              >
                Back to Welcome
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
