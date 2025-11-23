import React, { useEffect, useState } from 'react'

function slugify(str = ''){
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')
}

export default function Market({ marketId = '' }) {
  const [market, setMarket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    // Fetch the sample markets file (replace with real API endpoint if available)
    fetch('/sample_market.json')
      .then(res => {
        if(!res.ok) throw new Error('Failed to fetch market data')
        return res.json()
      })
      .then(json => {
        // The sample file contains a single `market` object. In a real app you'd fetch a list or an endpoint by id.

        // TODO: Evan change this to fetch by a market id
        const candidate = json.market

        const nameSlug = slugify(candidate.name)
        if(!marketId || marketId === candidate.marketid || marketId === nameSlug){
          setMarket(candidate)
        } else {
          setMarket(null)
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))

  }, [marketId])

  if(loading) return <main className="p-8"><p className="text-white">Loading market...</p></main>
  if(error) return <main className="p-8"><p className="text-red-400">Error: {error}</p></main>
  if(!market) return <main className="p-8"><p className="text-white">Market "{marketId}" not found.</p></main>

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold text-white">{market.name}</h1>
      <p className="text-sm text-neutral-400">ID: {market.marketid} • Status: {market.status}</p>

      <section className="mt-6">
        <h2 className="text-xl font-semibold text-white">Options</h2>
        <ul className="mt-3 space-y-3">
          {
            // odds range map to colors bar
            (() => {
              const getPercent = (opt) => {
                let percent = Number(opt.odds)
                if (Number.isNaN(percent)) percent = 0
                return Math.max(0, Math.min(100, percent))
              }

              const sorted = [...market.options].sort((a, b) => getPercent(b) - getPercent(a))

              return sorted.map((opt, idx) => {
                const percent = getPercent(opt)
                const p = percent / 100
                const hue = Math.round(p * 120) // 0 red -> 120 green
                const startHue = hue
                const endHue = Math.max(0, hue - 10)

                const barStyle = { // need a partial fill and empty part
                  width: `${percent}%`,
                  background: `linear-gradient(90deg, hsl(${startHue} 80% 50%), hsl(${endHue} 70% 40%))`,
                  height: '1.5rem',
                  borderRadius: '0.375rem'
                }

                return (
                  <li key={idx} className="p-3 bg-neutral-800 rounded">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <div className="text-lg text-white">{opt.option}</div>
                        <div className="text-sm text-neutral-400">Probability: {percent}%</div>
                      </div>
                      <div className="text-sm text-neutral-300">Bets: {opt.bets?.length || 0}</div>
                    </div>
                    <div className="w-full bg-neutral-700 rounded " style={{height: '1.5rem'}}>
                      <div style={barStyle} />
                    </div>
                  </li>
                )
              })
            })()
          }
        </ul>
      </section>

    </main>
  )
}
