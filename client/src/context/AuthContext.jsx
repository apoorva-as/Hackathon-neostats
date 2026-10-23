import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getErrorMessage, setUnauthorizedHandler } from '../services/api.js'
import * as authApi from '../services/auth.js'

// Who is signed in. On start-up the session is restored with GET /api/auth/me
// (the browser sends the HttpOnly cookie automatically). The user object is
// only used for UX (navigation, which buttons to show); the server checks
// every permission again on every request.
//
// status: 'loading' | 'authenticated' | 'anonymous' | 'error' (API unreachable)
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  // Shown on the login page, e.g. after the session expired.
  const [notice, setNotice] = useState(null)

  // Bumped by retry() to run the session check again.
  const [attempt, setAttempt] = useState(0)

  // Asks the API who the cookie belongs to (no cookie / invalid cookie = 401).
  useEffect(() => {
    let cancelled = false
    authApi
      .fetchCurrentUser()
      .then((user) => {
        if (cancelled) return
        setCurrentUser(user)
        setStatus('authenticated')
      })
      .catch((err) => {
        if (cancelled) return
        setCurrentUser(null)
        if (err?.response?.status === 401) {
          setStatus('anonymous')
        } else {
          setError(getErrorMessage(err))
          setStatus('error')
        }
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => {
    setStatus('loading')
    setError(null)
    setAttempt((n) => n + 1)
  }, [])

  // Any API call answering 401 means the session ended on the server
  // (expired, signed out elsewhere, or the account was deactivated).
  const signedIn = status === 'authenticated'
  useEffect(() => {
    if (!signedIn) return undefined
    setUnauthorizedHandler(() => {
      setCurrentUser(null)
      setStatus('anonymous')
      setNotice('Your session has ended. Please sign in again.')
    })
    return () => setUnauthorizedHandler(null)
  }, [signedIn])

  const login = useCallback(async (email, password) => {
    const user = await authApi.login(email, password)
    setNotice(null)
    setCurrentUser(user)
    setStatus('authenticated')
    return user
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      // Even if the request failed, forget the user locally.
      setCurrentUser(null)
      setStatus('anonymous')
      setNotice('You have been signed out.')
    }
  }, [])

  const value = useMemo(
    () => ({ currentUser, status, error, notice, login, logout, retry }),
    [currentUser, status, error, notice, login, logout, retry],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
