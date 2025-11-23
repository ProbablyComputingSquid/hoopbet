import React, { useState, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

export default function Create(){
  const { user, updateUser } = useContext(AuthContext)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleCreate(e){
    e.preventDefault()
    setMessage('')
    if(!user || !user.username) return setMessage('You must be logged in to create a market')
    if(!title.trim()) return setMessage('Title is required')

    setSubmitting(true)
    try{
      const res = await fetch('/markets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), ends_at: endsAt || null, username: user.username })
      })
      if(!res.ok) throw new Error(await res.text().catch(()=>res.statusText))
      const data = await res.json()
      setMessage('Market created')
      // update local user profile if server returned updated user
      if(data.user && updateUser) updateUser(data.user)
      // reset form
      setTitle('')
      setDescription('')
      setEndsAt('')
      window.location.hash=`#/market/${data.market.id}`
    }catch(err){
      setMessage(err.message || 'Failed to create market')
    }finally{ setSubmitting(false) }
  }

  return (
    <main className="p-8">
      <h1 className="text-4xl font-extrabold text-blue-400">Create Market</h1>
      <form onSubmit={handleCreate} className="mt-6 max-w-lg space-y-4">
        <div>
          <label className="block text-sm text-white">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 rounded bg-neutral-700 text-white" />
        </div>
        <div>
          <label className="block text-sm text-white">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 rounded bg-neutral-700 text-white" />
        </div>
        <div>
          <label className="block text-sm text-white">Ends At (ISO date/time)</label>
          <input value={endsAt} onChange={e => setEndsAt(e.target.value)} placeholder="2025-12-31T23:59:59Z" className="w-full px-3 py-2 rounded bg-neutral-700 text-white" />
        </div>
        <div>
          <button disabled={submitting} className="px-4 py-2 bg-green-600 text-white rounded">{submitting ? 'Creating…' : 'Create Market'}</button>
        </div>
        {message && <div className="text-sm text-indigo-200">{message}</div>}
      </form>
    </main>
  )
}