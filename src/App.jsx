import React, { useEffect, useState } from 'react'
import Nav from './components/Nav'
import Home from './pages/Home'
import Contact from './pages/Contact'
import Login from './pages/Login'
import Register from './pages/Register'
import './App.css'

function App(){
    const [route, setRoute] = useState(() => (window.location.hash || '#/').replace('#',''))

    useEffect(() => {
        const onHash = () => setRoute((window.location.hash || '#/').replace('#',''))
        window.addEventListener('hashchange', onHash)
        return () => window.removeEventListener('hashchange', onHash)
    }, [])

    let Page = null
    if(route === '/' || route === '') Page = Home
    else if(route.startsWith('/contact')) Page = Contact
    else if(route.startsWith('/login')) Page = Login
    else if(route.startsWith('/register')) Page = Register
    else Page = Home

    return (
        <div>
            <Nav />
            <Page />
        </div>
    )
}

export default App
