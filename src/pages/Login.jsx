import React from 'react'

export default function Login(){
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Login to HoopBet</h1>
      <form className="mt-4 space-y-4 max-w-md">
        <div>
          <label className="block text-sm">Username</label>
          <input className="w-full px-3 py-2 border rounded bg-neutral-600 text-white" />
        </div>
        <div>
          <label className="block text-sm">Password</label>
          <input type="password" className="w-full px-3 py-2 border rounded bg-neutral-600 text-white" />
        </div>
        <button className="px-4 py-2 bg-green-600 text-white rounded">Login</button>
      </form>
    </main>
  )
}
