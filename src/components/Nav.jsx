import React, { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

export default function Nav() {
  const { user, logout } = useContext(AuthContext)

  function handleLogout(){
    try{
      logout()
    }catch(e){ /* ignore */ }
    // redirect to home
    window.location.hash = '#/home'
  }

  return (
    <header>
      <nav className="sticky top-0  shadow-md">
        <ul className="flex items-center justify-end space-x-4 p-5">
          <li><a href="#/home" className="text-white hover:text-blue-400">Home</a></li>
          <li><a href="#/contact" className="text-white hover:text-blue-400">Contact</a></li>

          {user ? (
            <>
              <li className="hidden md:block"><a href="#/create" className='text-white hover:text-blue-400'>Create</a></li>

              <li className="hidden md:block"><span className="font-bold text-green-500">${user.balance?.toFixed ? user.balance.toFixed(2) : user.balance}</span></li>
              <li className="hidden md:block"><a href="#/profile" className="text-neutral semibold hover:text-blue-400"><span className="">{user.username ? "@" + user.username : user.full_name}</span></a></li>
              {window.location.hash == '#/profile' ? (
                <li>
                <button onClick={handleLogout} className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white">Logout</button>
                 </li>
              ): null}
              
            </>
          ) : (
            <>
              <li><a href="#/register" className="register">Register</a></li>
              <li><a href="#/login" className="login">Login</a></li>
            </>
          )}

        </ul>
      </nav>
    </header>
  )
}
