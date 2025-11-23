import React, { createContext, useCallback, useEffect, useState } from 'react'

export const AuthContext = createContext({ user: null, login: async () => false, logout: () => {} })

export function AuthProvider({ children }){
  const [user, setUser] = useState(() => {
    try{
      const raw = localStorage.getItem('hoopbet_user')
      return raw ? JSON.parse(raw) : null
    }catch(e){ return null }
  })

  useEffect(() => {
    if(user) localStorage.setItem('hoopbet_user', JSON.stringify(user))
    else localStorage.removeItem('hoopbet_user')
  }, [user])

  const login = useCallback(async (username, password) => {
    try{
      const res = await fetch('/users.json')
      if(!res.ok) throw new Error('Failed to fetch users')
      const users = await res.json()
      const record = users[username]
      if(!record) return { ok: false, message: 'User not found' }
      // Note: sample uses plaintext passwords. Replace with server auth in production.
      if(record.password !== password) return { ok: false, message: 'Invalid password' }

      const safeUser = { username, full_name: record.full_name, email: record.email, balance: record.balance }
      setUser(safeUser)
      return { ok: true, user: safeUser }
    }catch(err){
      return { ok: false, message: err.message }
    }
  }, [])

  const logout = useCallback(() => setUser(null), [])

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
