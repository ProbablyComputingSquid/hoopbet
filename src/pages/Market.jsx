import React, { useEffect, useState, useContext, useRef } from 'react'
import { AuthContext } from '../context/AuthContext'

function slugify(str = ''){
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')
}

export default function Market({ marketId = '' }) {
  const [market, setMarket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user, updateUser } = useContext(AuthContext)

  // Purchase UI state
  const [selectedOption, setSelectedOption] = useState(0)
  const [purchaseAmount, setPurchaseAmount] = useState('')
  const [submittingPurchase, setSubmittingPurchase] = useState(false)
  const [purchaseMessage, setPurchaseMessage] = useState('')
  const [purchaseError, setPurchaseError] = useState('')
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  function showToast(message, type = 'success'){
    setToast({ message, type })
    if(toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => {
      setToast(null)
      toastTimer.current = null
    }, 3500)
  }

  useEffect(() => {
    return () => { if(toastTimer.current) clearTimeout(toastTimer.current) }
  }, [])

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

  const getPercent = (opt) => {
    let percent = Number(opt.odds)
    if (Number.isNaN(percent)) percent = 0
    return Math.max(0, Math.min(100, percent))
  }

  function formatCurrency(v){
    const n = Number(v) || 0
    return `$${n.toFixed(2)}`
  }

  const sorted = market ? [...market.options].sort((a, b) => getPercent(b) - getPercent(a)) : []

  async function handlePurchase(e){
    e.preventDefault()
    setPurchaseError('')
    setPurchaseMessage('')

    if(!user){
      setPurchaseError('You must be logged in to place a bet.')
      showToast('You must be logged in to place a bet.', 'error')
      return
    }

    const amount = Number(purchaseAmount)
    if(!Number.isFinite(amount) || amount <= 0){
      setPurchaseError('Enter a valid amount greater than 0.')
      showToast('Enter a valid amount greater than 0.', 'error')
      return
    }

    const balance = Number(user.balance) || 0
    if(amount > balance){
      setPurchaseError('Insufficient balance.')
      showToast('Insufficient balance.', 'error')
      return
    }

    setSubmittingPurchase(true)
    try{
      // Build bet object values
      const opt = market.options[selectedOption]
      const placed_at = new Date().toISOString()

      // Update local market state: consolidate bets by username for the same option
      setMarket(prev => {
        if(!prev) return prev
        const newOptions = prev.options.map((o, i) => {
          if(i !== selectedOption) return o
          const bets = Array.isArray(o.bets) ? [...o.bets] : []
          const existingIndex = bets.findIndex(b => b.username === user.username)
          if(existingIndex >= 0){
            // increase existing bet amount and update timestamp
            const existing = { ...bets[existingIndex] }
            existing.amount = (Number(existing.amount) || 0) + amount
            existing.timestamp = placed_at
            bets[existingIndex] = existing
          } else {
            // add new bet entry
            bets.push({ user: user.full_name || user.username, username: user.username, amount, odds: Number(opt.odds), timestamp: placed_at })
          }
          return { ...o, bets }
        })
        return { ...prev, options: newOptions }
      })

      // Update user's local bets_placed and balance (consolidate by marketid+option)
      try{
        const prevBets = Array.isArray(user.bets_placed) ? [...user.bets_placed] : []
        const betIndex = prevBets.findIndex(b => b.marketid === market.marketid && b.option === opt.option)
        if(betIndex >= 0){
          prevBets[betIndex] = { ...prevBets[betIndex], amount: (Number(prevBets[betIndex].amount) || 0) + amount, placed_at }
        } else {
          prevBets.push({ marketid: market.marketid, option: opt.option, amount, odds: opt.odds, placed_at })
        }
        updateUser && updateUser({ balance: Math.max(0, balance - amount), bets_placed: prevBets })
      }catch(e){}

      setPurchaseMessage('Bet placed successfully!')
      showToast(`Bet placed: $${amount.toFixed(2)} on "${opt.option}"`, 'success')
      setPurchaseAmount('')
    }catch(err){
      setPurchaseError('Failed to place bet — try again.')
      showToast('Failed to place bet — try again.', 'error')
    }finally{
      setSubmittingPurchase(false)
    }
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold text-white">{market.name}</h1>
      <p className="text-sm text-neutral-400">ID: {market.marketid} • Status: {market.status}</p>

      <section className="mt-6">
        <h2 className="text-xl font-semibold text-white">Options</h2>
        <ul className="mt-3 space-y-3">
          {
            // Display the options sorted by percent (highest -> lowest)
            sorted.map((opt, idx) => {
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
                      {user && (
                        (() => {
                          const myBet = (opt.bets || []).find(b => b.username === user.username)
                          if(!myBet) return null
                          return <div className="text-sm text-green-300 mt-1">Your stake: {formatCurrency(myBet.amount)}</div>
                        })()
                      )}
                    </div>
                    <div className="text-sm text-neutral-300">Bets: {opt.bets?.length || 0}</div>
                  </div>
                  <div className="w-full bg-neutral-700 rounded " style={{height: '1.5rem'}}>
                    <div style={barStyle} />
                  </div>
                </li>
              )
            })
          }
        </ul>
      </section>

      {/* Purchase section: user chooses an option and amount to place a bet */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold text-white">Place a Bet</h2>
        <form onSubmit={handlePurchase} className="mt-3 max-w-lg space-y-3">
          <div>
            <label className="block text-sm text-neutral-300">Option</label>
            <select value={selectedOption} onChange={e => setSelectedOption(Number(e.target.value))} className="w-full px-3 py-2 rounded bg-neutral-700 text-white">
              {market.options.map((o, i) => (
                <option key={i} value={i}>{o.option} (Odds: {o.odds})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-neutral-300">Amount</label>
            <input value={purchaseAmount} onChange={e => setPurchaseAmount(e.target.value)} type="number" step="0.01" min="0" className="w-full px-3 py-2 rounded bg-neutral-700 text-white" />
            <div className="text-sm text-neutral-400 mt-1">{user ? `Your balance: $${(Number(user.balance) || 0).toFixed(2)}` : 'Log in to see your balance.'}</div>
          </div>

          <div>
            <button disabled={submittingPurchase} className="px-4 py-2 bg-blue-600 text-white rounded">{submittingPurchase ? 'Placing…' : 'Place Bet'}</button>
          </div>

              {purchaseError && <div className="text-sm text-red-400">{purchaseError}</div>}
              {purchaseMessage && <div className="text-sm text-green-400">{purchaseMessage}</div>}
        </form>
      </section>
          {/* Toast notification */}
          {toast && (
            <div className={`fixed bottom-6 right-6 max-w-xs z-50 ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'} text-white px-4 py-3 rounded shadow-lg`} role="status">
              <div className="text-sm">{toast.message}</div>
            </div>
          )}

    </main>
  )
}
