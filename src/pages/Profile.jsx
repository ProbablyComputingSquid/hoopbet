import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../context/AuthContext'

function fmtDate(d) {
    if(!d) return ''
    try{
        const dt = new Date(d)
        return dt.toLocaleString()
    }catch(e){ return d }
}

export default function Profile(){
    const { user } = useContext(AuthContext)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if(!user){
            setProfile(null)
            return
        }

        // Try to enrich the user object with full data (bets, joined_at) from users.json if available
        setLoading(true)
        setError('')
        fetch('/users.json') // TODO @evan - fetch actual API endpoint for user profile data
            .then(res => {
                if(!res.ok) throw new Error('Failed to fetch user data')
                return res.json()
            })
            .then(json => {
                const stored = json && json[user.username]
                if(stored){
                    const safe = {
                        username: user.username || user.username,
                        full_name: stored.full_name || user.full_name || '',
                        email: stored.email || user.email || '',
                        balance: stored.balance ?? user.balance ?? 0,
                        joined_at: stored.joined_at || null,
                        bets_placed: stored.bets_placed || [],
                        created_markets: stored.created_markets || [],
                        resolved_markets: stored.resolved_markets || []
                    }
                    setProfile(safe)
                } else {
                    // fallback to whatever is in context
                    setProfile({
                        username: user.username,
                        full_name: user.full_name || '',
                        email: user.email || '',
                        balance: user.balance ?? 0,
                        bets_placed: user.bets_placed || [],
                        created_markets: user.created_markets || [],
                        resolved_markets: user.resolved_markets || []
                    })
                }
            })
            .catch(err => setError(err.message || 'Failed to load profile'))
            .finally(() => setLoading(false))

    }, [user])

    if(!user) return (
        <main className="p-8">
            <h1 className="text-2xl font-semibold">Profile</h1>
            <p className="mt-4 text-white">You are not logged in. <a href="#/login" className="text-blue-400">Log in</a> to view your profile and bets.</p>
        </main>
    )

    if(loading) return <main className="p-8"><p className="text-white">Loading profile...</p></main>
    if(error) return <main className="p-8"><p className="text-red-400">Error: {error}</p></main>

    return (
        <main className="p-8">
            <section className="mt-4 p-4 bg-neutral-800 rounded">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">{profile?.full_name || profile?.username}</h1>
                        <div className="text-sm text-neutral-400">@{profile?.username}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-neutral-400">Balance</div>
                        <div className="text-xl font-bold text-green-400">${profile?.balance?.toFixed ? profile.balance.toFixed(2) : profile?.balance}</div>
                    </div>
                </div>
                <div className="mt-3 text-sm text-neutral-300">{profile?.email}</div>
                {profile?.joined_at && <div className="mt-1 text-xs text-neutral-500">Joined: {fmtDate(profile.joined_at)}</div>}
            </section>

            <section className="mt-6">
                <h2 className="text-xl font-semibold text-white">Resolved Markets</h2>
                {(!profile?.resolved_markets || profile.resolved_markets.length === 0) ? (
                    <p className="text-neutral-400 mt-3">You have not resolved any markets yet.</p>
                ) : (
                    <ul className="mt-3 space-y-2">
                        {profile.resolved_markets.map((m, i) => (
                            <li key={i}><a className="text-blue-400" href={`#/market/${m}`}>Market {m}</a></li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="mt-6">
                <h2 className="text-xl font-semibold text-white">Bets</h2>
                {(!profile?.bets_placed || profile.bets_placed.length === 0) ? (
                    <p className="text-neutral-400 mt-3">You have not placed any bets yet.</p>
                ) : (
                    <ul className="mt-3 space-y-3">
                        {profile.bets_placed.map((b, i) => (
                            <li key={i} className="p-3 bg-neutral-800 rounded">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-white">{b.option}</div>
                                        <div className="text-sm text-neutral-400">Market: <a className="text-blue-400" href={`#/market/${b.marketid}`}>{b.marketid}</a></div>
                                        <div className="text-sm text-neutral-400">Odds: {b.odds}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-white">${b.amount}</div>
                                        <div className="text-sm text-neutral-500">{fmtDate(b.placed_at)}</div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </main>
    )
}