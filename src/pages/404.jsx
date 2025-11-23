import React from 'React'

export default function NotFound(){
    return (
        <main className="p-8">
        <h1 className="text-4xl font-extrabold text-blue-400">404 - Page Not Found</h1>
        <p className="text-white mt-4">Sorry, hoopbet could not find the page you're looking for</p>
        <a href="/home"><button>Go Home</button></a>
        </main>
    )
    }