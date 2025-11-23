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
  
  /**
   * login(username, password)
   * - For the demo, this function fetches `/users.json` and compares the
   *   plaintext password. If successful, it sets a safe user object in state.
   * - Returns an object: `{ ok: boolean, user?, message? }` so callers can
   *   display friendly errors or react to success.
   */
  const login = useCallback(async (username, password) => {
    try{
      const res = await fetch('/users.json')
      if(!res.ok) throw new Error('Failed to fetch users')
      const users = await res.json()
      const record = users[username]
      if(!record) return { ok: false, message: 'User not found' }
      // Note: sample uses plaintext passwords. TODO: Replace with server auth in production.
      if(record.password !== password) return { ok: false, message: 'Invalid password' }

      const safeUser = { username, full_name: record.full_name, email: record.email, balance: record.balance }
      setUser(safeUser)
      return { ok: true, user: safeUser }
    }catch(err){
      return { ok: false, message: err.message }
    }
  }, [])

  const logout = useCallback(() => setUser(null), [])
  
    // updateUser allows merging a partial update into the stored user object.
    // Useful for small UI actions (e.g. adjusting a demo balance after a purchase).
    const updateUser = useCallback((patch) => {
      setUser(prev => {
        if(!prev) return prev
        return { ...prev, ...patch }
      })
    }, [])

  return (
      <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider

/**
 * isLoggedIn()
 * Utility for non-React code to check whether a HoopBet user session is
 * currently stored in localStorage. This is synchronous and reads the same
 * storage key used by the provider. It returns `true` if a stored user object
 * with a `username` property exists.
 *
 * Note: this is a convenience helper for UI checks; it does not validate any
 * server session and should not be used as a security gate.
 */
export function isLoggedIn(){
  try{
    const raw = localStorage.getItem('hoopbet_user')
    if(!raw) return false
    const u = JSON.parse(raw)
    return !!(u && u.username)
  }catch(e){
    return false
  }
}
