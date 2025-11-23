import React, { useEffect, useState } from 'react'

export default function Home() {
  const words = ['Challenges','Games','Wagers','Contests','Events']
  const [wordIndex, setWordIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const typeSpeed = 100
    const deleteSpeed = 50
    const pauseAfterFull = 1400

    let timeout = null
    const word = words[wordIndex]

    if (!deleting) {
      if (charIndex < word.length) {
        // initial small delay on first character
        const delay = (charIndex === 0 && wordIndex === 0) ? 500 : typeSpeed
        timeout = setTimeout(() => setCharIndex(ci => ci + 1), delay)
      } else {
        // finished typing — pause, then start deleting
        timeout = setTimeout(() => setDeleting(true), pauseAfterFull)
      }
    } else {
      if (charIndex > 0) {
        timeout = setTimeout(() => setCharIndex(ci => ci - 1), deleteSpeed)
      } else {
        // finished deleting — move to next word and start typing
        setDeleting(false)
        setWordIndex(wi => (wi + 1) % words.length)
      }
    }

    return () => clearTimeout(timeout)
  }, [charIndex, deleting, wordIndex])

  const current = words[wordIndex].slice(0, charIndex)

  return (
    <main>
      <div id="title-box" className="text-center mt-8 space-y-6 bg-neutral-900">
        <h1 className="text-4xl font-extrabold text-blue-400">HoopBet</h1>
        <h2 className="text-2xl font-semibold text-indigo-600">Modern Microbetting—Reimagined</h2>
        <a href="#/register"> <button className="border border-black px-4 py-2 rounded bg-green-700 text-white sheen">Get Started</button></a>
      </div>

      <hr className="my-10 border-gray-700 border-t-4" />

      <div id="about" className="text-center mt-6 space-y-6">
        <h2 className="text-2xl font-semibold text-indigo-400">Bet On <span id="bet-flip" className="typewriter text-indigo-300">{current}</span> With Your Friends</h2>
        <p className="text-white">Ever wanted to place bets with your friends in real-time, but your friends never pay you back? With HoopBet you can place microbets on challenges, games and events as they happen.</p>
      
      <h2 className="text-2xl font-semibold text-indigo-400">Live Market Tracking</h2>
        <p className="text-white">
            Stay updated with real-time community odds and market trends. Our platform provides live tracking of all bets and challenges, ensuring you never miss an opportunity to win.
        </p>
        <h2 className="text-2xl font-semibold text-indigo-400">No House Edge</h2>
        <p className="text-white">
            HoopBet is for friends, and between friends. We do not interfere with your bets by taking a house cut or edge, ensuring a fair and transparent betting experience.
        </p>
        <h2 className="text-2xl font-semibold text-indigo-400">Community-Focused With Privacy in Mind</h2>
        <p className="text-white">
            HoopBet fosters a social betting environment where you can connect, compete, and celebrate wins together. All markets are resolved by a dedicated Resolver who ensures that outcomes are fair and transparent. All markets are by default private to ensure your betting activities remain confidential.
        </p>
        </div>
    </main>
  )
}
