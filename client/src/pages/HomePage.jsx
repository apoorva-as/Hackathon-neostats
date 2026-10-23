import { useState } from 'react'
import { getHealth } from '../services/api.js'

// Setup-phase placeholder. It only shows that React is running and can
// reach the backend. Real application pages are not built yet.
function HomePage() {
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleCheck() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      setResult(await getHealth())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-slate-900">
          NEOSTATS Project Management Platform
        </h1>
        <p className="mt-2 text-slate-600">
          Setup phase: React, Vite, Tailwind CSS and React Router are running.
          Application features have not been built yet.
        </p>

        <button
          type="button"
          onClick={handleCheck}
          disabled={loading}
          className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? 'Checking…' : 'Check backend health'}
        </button>

        {result && (
          <pre className="mt-4 overflow-x-auto rounded bg-slate-100 p-3 text-sm text-slate-800">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
        {error && (
          <p className="mt-4 text-sm text-red-600">
            Could not reach the backend: {error}
          </p>
        )}
      </div>
    </main>
  )
}

export default HomePage
