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

  // Resolution time picker state must be declared with other hooks
  const [resolutionLocal, setResolutionLocal] = useState('')
  const [resolutionChoice, setResolutionChoice] = useState('')
  useEffect(() => {
    if (!market) return setResolutionLocal('')
    // prefer market.ends_at as a candidate for resolution time
    const iso = market.ends_at || market.resolved_at || ''
    if (!iso) return setResolutionLocal('')
    const dt = new Date(iso)
    if (Number.isNaN(dt.getTime())) return setResolutionLocal('')
    const pad = (n) => String(n).padStart(2, '0')
    const local = `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
    setResolutionLocal(local)
  }, [market])

  useEffect(() => {
    setLoading(true)
    setError(null)

    // Fetch the real market from backend POST /markets
    fetch('/markets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marketId })
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch market data')
        return res.json()
      })
      .then(data => {
        // backend returns the JSON file content. Support both { market: { ... } } and direct shapes
        const src = data && data.market ? data.market : data
        if (!src) return setMarket(null)

        // build options array from typical data/Markets files which contain `yes` and `no` arrays
        const yesBets = Array.isArray(src.yes) ? src.yes.map(b => ({ username: b.userID || b.username, amount: Number(b.amount) || 0, placed_at: b.placed_at || b.timestamp })) : []
        const noBets = Array.isArray(src.no) ? src.no.map(b => ({ username: b.userID || b.username, amount: Number(b.amount) || 0, placed_at: b.placed_at || b.timestamp })) : []

        const sum = arr => arr.reduce((s, x) => s + (Number(x.amount) || 0), 0)
        const yesSum = sum(yesBets)
        const noSum = sum(noBets)
        const total = Math.max(1, yesSum + noSum)

        const options = [
          { option: 'Yes', odds: (yesSum / total) * 100, bets: yesBets },
          { option: 'No', odds: (noSum / total) * 100, bets: noBets }
        ]

        const mapped = {
          id: src.id || marketId,
          marketid: src.id || marketId,
          name: src.name || src.title || `Market ${marketId}`,
          status: src.status || 'open',
          created_at: src.created_at,
          ends_at: src.ends_at,
          options
        }

        setMarket(mapped)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))

  }, [marketId])
  // user earnings/loss for this market
  const [userNet, setUserNet] = useState(null)
  const [userStake, setUserStake] = useState(0)

  useEffect(() => {
    if (!user || !market) return setUserNet(null)
    // fetch full users.json to compute user's bets for this market
    fetch('/users.json')
      .then(r => r.ok ? r.json() : Promise.reject('failed'))
      .then(json => {
        const u = json[user.username]
        if (!u) return setUserNet(null)
        const bets = Array.isArray(u.bets_placed) ? u.bets_placed.filter(b => String(b.marketid) === String(market.marketid || market.id)) : []
        let stake = 0
        let net = 0
        bets.forEach(b => {
          const amt = Number(b.amount) || 0
          stake += amt
          if (b.payout !== undefined) {
            net += (Number(b.payout) || 0) - amt
          } else if (market.status === 'resolved') {
            // resolved but no payout recorded => lost
            net -= amt
          } else {
            // unresolved: show negative stake (exposure)
            net -= amt
          }
        })
        setUserStake(stake)
        setUserNet(net)
      })
      .catch(() => { setUserNet(null); setUserStake(0) })
  }, [user, market])

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

  const sumBetsAmount = (bets) => Array.isArray(bets) ? bets.reduce((s, b) => s + (Number(b.amount) || 0), 0) : 0
  const marketVolume = market ? market.options.reduce((s, o) => s + sumBetsAmount(o.bets), 0) : 0


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
        // send bet to backend to persist
        const placed_at = new Date().toISOString()
        const resp = await fetch('/markets/bet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ marketId: market.marketid || marketId, optionIndex: selectedOption, amount, username: user.username, placed_at })
        })
        if(!resp.ok) {
          const errText = await resp.text().catch(()=>null) || resp.statusText
          throw new Error(errText || 'Failed to place bet')
        }

        const data = await resp.json()
        // backend returns { market, user }
        if(data.market) setMarket(data.market)
        if(data.user && updateUser) updateUser(data.user)

        setPurchaseMessage('Bet placed successfully!')
        showToast(`Bet placed: $${amount.toFixed(2)} on "${(market.options[selectedOption]||{}).option}"`, 'success')
        setPurchaseAmount('')
    }catch(err){
      setPurchaseError('Failed to place bet — try again.')
      showToast('Failed to place bet — try again.', 'error')
    }finally{
      setSubmittingPurchase(false)
    }
  }

  const canSetResolution = !!(user && (user.username === market?.resolver?.username || (user.created_markets || []).includes(market?.marketid)))

  async function saveResolution(){
    if (!resolutionLocal) return showToast('Pick a date and time first', 'error')
    // convert local datetime-local value to an ISO string (assume local timezone)
    const iso = new Date(resolutionLocal).toISOString()

    try{
      // try backend endpoint; if not available we'll update UI locally
      const res = await fetch('/markets/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketId: market.marketid || market.id, resolved_at: iso, resolver: user.username, resolution: resolutionChoice || undefined })
      })
      if (res.ok){
        const data = await res.json()
        if (data.market) setMarket(data.market)
        showToast('Resolution time saved', 'success')
        return
      }
    }catch(e){}

    // fallback: update local UI only
    setMarket(prev => prev ? { ...prev, resolved_at: iso, resolver: { username: user.username, user: user.full_name || user.username } } : prev)
    showToast('Resolution time set (local only)', 'success')
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold text-white">{market.name}</h1>
      <p className="text-sm text-neutral-400">ID: {market.id} • Status: {market.status} {market.resolution ? `: ${market.resolution}` : ''}</p>
      {market.description && <p className="mt-2 text-neutral-300">{market.description}</p>}
      {market.resolver && (
        <div className="mt-2 text-sm text-neutral-400">
          Resolver: <span className="text-white">{market.resolver.user || market.resolver.username}</span>
          {market.resolved_at || market.resolution ? (
            <span className="ml-3 text-sm text-green-300">Resolved{market.resolution ? `: ${market.resolution}` : ''}{market.resolved_at ? ` • ${new Date(market.resolved_at).toLocaleString()}` : ''}</span>
          ) : (
            <span className="ml-3 text-sm text-yellow-300">Unresolved</span>
          )}
        </div>
      )}

      {user && (userNet !== null) && (
        <div className="mt-3 p-3 bg-neutral-800 rounded">
          <div className="text-sm text-neutral-400">Your stake on this market:</div>
          <div className={`text-lg font-bold ${userNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>{userNet >= 0 ? '+' : ''}{formatCurrency(userNet)} {market.status === 'resolved' ? '(net gain)' : '(current exposure)'}</div>
          {userStake > 0 && <div className="text-sm text-neutral-400">(Total staked: {formatCurrency(userStake)})</div>}
        </div>
      )}

      {/* Resolver controls: pick resolution outcome and datetime, then resolve & payout */}
      {canSetResolution && market.status !== 'resolved' && (
        <div className="mt-4 p-4 bg-neutral-800 rounded">
          <div className="flex gap-3 items-center">
            <label className="text-sm text-neutral-300">Resolve As</label>
            <select value={resolutionChoice} onChange={e => setResolutionChoice(e.target.value)} className="px-2 py-1 rounded bg-neutral-700 text-white">
              <option value="">-- choose outcome --</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>

            <label className="text-sm text-neutral-300">Resolve At</label>
            <input type="datetime-local" value={resolutionLocal} onChange={e => setResolutionLocal(e.target.value)} className="px-2 py-1 rounded bg-neutral-700 text-white" />

            <button onClick={saveResolution} type="button" className="px-3 py-1 bg-blue-600 text-white rounded">Save Time</button>
            <button onClick={async () => {
              if(!resolutionChoice) return showToast('Pick an outcome to resolve', 'error')
              if(!resolutionLocal) return showToast('Pick a date/time to resolve', 'error')
              // call resolve endpoint with resolution to trigger payouts
              try{
                const res = await fetch('/markets/resolve', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ marketId: market.marketid || market.id, resolved_at: new Date(resolutionLocal).toISOString(), resolver: user.username, resolution: resolutionChoice })
                })
                if(!res.ok) throw new Error(await res.text().catch(()=>res.statusText))
                const data = await res.json()
                if(data.market) setMarket(data.market)
                // update current user if server returned users map
                if(data.users && user && data.users[user.username] && updateUser) updateUser(data.users[user.username])
                showToast('Market resolved and payouts distributed', 'success')
              }catch(err){
                showToast('Failed to resolve market: ' + (err.message||''), 'error')
              }
            }} type="button" className="px-3 py-1 bg-green-600 text-white rounded">Resolve & Payout</button>
          </div>
        </div>
      )}

      <section className="mt-6">
        <h2 className="text-xl font-semibold text-white">Options</h2>
        <div className="mb-4 text-sm text-neutral-300">Total market volume: <span className="text-white">{formatCurrency(marketVolume)}</span></div>
        <ul className="mt-3 space-y-3">
          {sorted.map((opt, idx) => {
            const percent = Math.round(getPercent(opt))
            const optVolume = sumBetsAmount(opt.bets)
            const barStyle = { width: `${percent}%`, height: '100%', background: '#10b981', borderRadius: '0.375rem' }

            return (
              <li key={idx} className="p-3 bg-neutral-800 rounded">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <div className="text-lg text-white">{opt.option}</div>
                    <div className="text-sm text-neutral-400">Probability: {percent}%</div>
                    {user && (() => {
                      // sum all bets by this user for this option
                      const myStake = (opt.bets || []).reduce((s, b) => s + ((b.username === user.username) ? (Number(b.amount) || 0) : 0), 0)
                      if (!myStake) return null
                      return <div className="text-sm text-green-300 mt-1">Your stake: {formatCurrency(myStake)}</div>
                    })()}
                  </div>
                  <div className="text-sm text-neutral-300">Bets: {opt.bets?.length || 0} • Volume: {formatCurrency(optVolume)}</div>
                </div>
                <div className="w-full bg-neutral-700 rounded " style={{ height: '1.5rem' }}>
                  <div style={barStyle} />
                </div>
              </li>
            )
          })}
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
