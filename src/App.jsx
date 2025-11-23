import React, { useEffect, useState } from 'react'
import Nav from './components/Nav'
import Footer from './components/Footer'
import Home from './pages/Home'
import Contact from './pages/Contact'
import Login from './pages/Login'
import Register from './pages/Register'
import Market from './pages/Market'
import NotFound from './pages/NotFound'
import './output.css'

function App(){
    const [route, setRoute] = useState(() => (window.location.hash || '#/').replace('#',''))

    useEffect(() => {
        const onHash = () => setRoute((window.location.hash || '#/').replace('#',''))
        window.addEventListener('hashchange', onHash)
        return () => window.removeEventListener('hashchange', onHash)
    }, [])

    let Page = null
    if(route === '/' || route === '' || route === '/home') Page = Home
    else if(route.startsWith('/contact')) Page = Contact
    else if(route.startsWith('/login')) Page = Login
    else if(route.startsWith('/register')) Page = Register
    else if (route.startsWith('/market')) Page = Market
    else Page = NotFound

        const locationKey = `${window.location.pathname}${window.location.search}${window.location.hash}`

        return (
            <div>
                <Nav />
                <Page key={locationKey} />
                <Footer />
            </div>
        )
}

export default App
