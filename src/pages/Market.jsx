import React from 'react'

async function getData() {
   const res = await fetch('./sample_market.json');
   const data = await res.json();
   return this.setState({data});
}
export default function Market() {
    console.log("Market Page Loaded");
  return (
    <main>
      <h1 className="text-4xl font-extrabold text-blue-400">Market - (market name) </h1>
      <p className="text-white">this page will display info about a market</p>
    </main>
  )
}