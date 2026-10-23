import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage } from '../services/api.js'

// Runs an async API call when `deps` change and tracks loading/error state.
// `reload()` runs it again (e.g. after a create/update/delete).
export function useApi(fetcher, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState((prev) => ({ ...prev, loading: true, error: null }))
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false })
      })
      .catch((error) => {
        if (!cancelled) setState({ data: null, error: getErrorMessage(error), loading: false })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  return { ...state, reload }
}
