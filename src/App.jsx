import React, { useEffect, useState, useContext} from 'react'
import Nav from './components/Nav'
import Footer from './components/Footer'
import Home from './pages/Home'
import Contact from './pages/Contact'
import Login from './pages/Login'
import Register from './pages/Register'
import Market from './pages/Market'
import NotFound from './pages/NotFound'
import Profile from './pages/Profile'
import Create from './pages/Create'
import {isLoggedIn, AuthContext} from './context/AuthContext'
import './output.css'

function App(){
    const [route, setRoute] = useState(() => (window.location.hash || '#/').replace('#',''))

    useEffect(() => {
        const onHash = () => setRoute((window.location.hash || '#/').replace('#',''))
        window.addEventListener('hashchange', onHash)
        return () => window.removeEventListener('hashchange', onHash)
    }, [])
    // yoink data from authcontext
    const { user, logout } = useContext(AuthContext)

    let Page = null
    if(route === '/' || route === '' || route === '/home') Page = Home
    else if(route.startsWith('/contact')) Page = Contact
    else if (route.startsWith('/logout')) {
        localStorage.removeItem("authUser");
        window.location.hash = '#/home';
        Page = Home;
    }
    else if ((route.startsWith('/login') || route.startsWith('/register')) && user) {
      window.location.hash = '#/profile'
      Page = Profile
    } else if(route.startsWith('/login')) Page = Login
    else if(route.startsWith('/register')) Page = Register
    else if (route.startsWith('/market')) Page = Market
    else if (route.startsWith('/profile')) Page = Profile
    else if (route.startsWith('/create') && user) Page = Create
    else if (route.startsWith('/create') && !user) {
        window.location.hash = '#/login'
        Page = Login
    }

    else Page = NotFound

        const locationKey = `${window.location.pathname}${window.location.search}${window.location.hash}`

        return (
            <div>
                <Nav />
                {
                    // If viewing a market route, extract the id segment and pass as prop so Market can fetch/render accordingly
                    route.startsWith('/market') ? (
                        (() => {
                            const parts = route.split('/')
                            const marketId = parts[2] || ''
                            return <Page key={locationKey} marketId={marketId} />
                        })()
                    ) : (
                        <Page key={locationKey} />
                    )
                }
                <Footer />
            </div>
        )
}

export default App
