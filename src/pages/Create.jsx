import React from 'react';
import AuthContext from '../context/AuthContext';
export default function Create(){
  const { user } = useContext(AuthContext);
  return (
    <main className="p-8">
      <h1 className="text-4xl font-extrabold text-blue-400">Create Page</h1>
      <p className="text-white mt-4">This is where users can create new bets or challenges.</p>
    </main>
  )
}