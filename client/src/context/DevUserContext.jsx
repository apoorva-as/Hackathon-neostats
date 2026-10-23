import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getErrorMessage, setDevUserId } from '../services/api.js'
import { listDevUsers } from '../services/users.js'

// ---------------------------------------------------------------------------
// TEMPORARY (Phase 1): development user switcher. NOT authentication.
// Lets you view the app as any seeded user. The chosen id is remembered in
// localStorage and sent to the API, which loads the real role from the DB.
// Phase 3 replaces this with a real AuthContext (login + JWT).
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'neostats.devUserId'
const DevUserContext = createContext(null)

function readStoredId() {
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) || null
  } catch {
    return null
  }
}

export function DevUserProvider({ children }) {
  const [users, setUsers] = useState([])
  const [currentUserId, setCurrentUserId] = useState(readStoredId)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    listDevUsers()
      .then((list) => {
        if (cancelled) return
        setUsers(list)
        // Keep the stored user if it still exists, otherwise default to an Admin.
        setCurrentUserId((id) => {
          const found = list.find((u) => u.id === id)
          const fallback = list.find((u) => u.role === 'ADMIN') ?? list[0]
          return (found ?? fallback)?.id ?? null
        })
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [attempt])

  const currentUser = users.find((u) => u.id === currentUserId) ?? null

  // Set the request header synchronously during render so child pages that
  // fetch in their first effect already send the right user id.
  setDevUserId(currentUser?.id ?? null)

  useEffect(() => {
    try {
      if (currentUser) localStorage.setItem(STORAGE_KEY, String(currentUser.id))
    } catch {
      // Storage can be unavailable (private mode); the switcher still works.
    }
  }, [currentUser])

  const selectUser = useCallback((id) => setCurrentUserId(Number(id)), [])
  const retry = useCallback(() => {
    setLoading(true)
    setError(null)
    setAttempt((n) => n + 1)
  }, [])

  const value = useMemo(
    () => ({ users, currentUser, selectUser, loading, error, retry }),
    [users, currentUser, selectUser, loading, error, retry],
  )
  return <DevUserContext.Provider value={value}>{children}</DevUserContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useDevUser() {
  const context = useContext(DevUserContext)
  if (!context) throw new Error('useDevUser must be used inside <DevUserProvider>')
  return context
}
