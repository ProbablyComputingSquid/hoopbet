import React, { useState } from 'react'

export default function Register(){
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({ username: '', password: '' })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  function validateUsername(value){
    if(!value || value.trim().length === 0) return 'Username is required.'
    if(value.length < 3) return 'Username must be at least 3 characters.'
    if(value.length > 30) return 'Username must be 30 characters or fewer.'
    if(!/^[a-zA-Z0-9_-]+$/.test(value)) return 'Username may only include letters, numbers, underscore and dash.'
    return ''
  }

  function validatePassword(value){
    if(!value || value.length === 0) return 'Password is required.'
    if(value.length < 8) return 'Password must be at least 8 characters.'
    if(!/[0-9]/.test(value)) return 'Password should include at least one number.'
    return ''
  }

  function runValidation(){
    const uErr = validateUsername(username)
    const pErr = validatePassword(password)
    setErrors({ username: uErr, password: pErr })
    return !uErr && !pErr
  }

  async function handleSubmit(e){
    e.preventDefault()
    setMessage('')
    if(!runValidation()) return
    setSubmitting(true)

    try{
      // TODO: actually register 
      await new Promise(res => setTimeout(res, 600))
      console.log('registration attempt', { username, password })
      setMessage('registraiton simulated (replace with real authentication).')
    }catch(err){
      setMessage('register failed — try again.')
    }finally{
      setSubmitting(false)
    }
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Register for HoopBet</h1>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-w-md" noValidate>
        <div>
          <label className="block text-sm">Username</label>
          <input
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onBlur={() => setErrors(es => ({...es, username: validateUsername(username)}))}
            className="w-full px-3 py-2 border rounded bg-neutral-600 text-white"
          />
          {errors.username && <div className="text-sm text-red-400 mt-1">{errors.username}</div>}
        </div>
        <div>
          <label className="block text-sm">Password</label>
          <input
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setErrors(es => ({...es, password: validatePassword(password)}))}
            className="w-full px-3 py-2 border rounded bg-neutral-600 text-white"
          />
          {errors.password && <div className="text-sm text-red-400 mt-1">{errors.password}</div>}
        </div>
        <div>
          <button disabled={submitting} className="px-4 py-2 bg-green-600 text-white rounded">
            {submitting ? 'Logging in…' : 'Login'}
          </button>
        </div>
        {message && <div className="text-sm text-indigo-200">{message}</div>}
      </form>
    </main>
  )
}
