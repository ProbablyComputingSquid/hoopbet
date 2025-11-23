import React from 'react'

export default function Nav() {
  return (
    <header>
      <nav>
        <ul className="flex justify-end space-x-5 p-5 m-5">
          <li><a href="#/" className="text-white hover:text-blue-400">Home</a></li>
          <li><a href="#/about" className="text-white hover:text-blue-400">Features</a></li>
          <li><a href="#/contact" className="text-white hover:text-blue-400">Contact</a></li>
          <li><a href="#/register" className="text-white hover:text-blue-400">Register</a></li>
          <li><a href="#/login" className="px-2 py-1 rounded text-white bg-green-600 hover:bg-green-400 focus:bg-green-900">Login</a></li>
        </ul>
      </nav>
    </header>
  )
}
