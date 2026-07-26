import { useCallback, useEffect, useRef, useState } from 'react'

// In-memory cache shared by all screens, so going "back" or switching tabs
// shows the last known data instantly instead of a spinner.
const store = new Map()

export function clearDataCache() { store.clear() }

// Reject rather than hang forever if the network stalls — a stuck promise is
// what used to leave the page on "Loading…" until a manual refresh.
function withTimeout(promise, ms = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e) => { clearTimeout(timer); reject(e) }
    )
  })
}

/**
 * Load data with a cache.
 *   key    — cache identity (include anything the data depends on)
 *   loader — async () => value
 * Returns { data, loading, error, reload, setData }.
 * `loading` is only true the first time this key is ever loaded; afterwards
 * refreshes happen quietly in the background.
 */
export function useCachedLoad(key, loader) {
  const [data, setData] = useState(() => store.get(key))
  const [loading, setLoading] = useState(() => !store.has(key))
  const [error, setError] = useState(null)
  const loaderRef = useRef(loader)
  loaderRef.current = loader
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false }, [])

  const reload = useCallback(async () => {
    if (!store.has(key)) setLoading(true)
    setError(null)
    try {
      const value = await withTimeout(loaderRef.current())
      store.set(key, value)
      if (alive.current) setData(value)
    } catch (e) {
      if (alive.current) setError(e)
    } finally {
      if (alive.current) setLoading(false)
    }
  }, [key])

  // Show whatever is cached for this key immediately, then refresh.
  useEffect(() => {
    setData(store.get(key))
    setLoading(!store.has(key))
    reload()
  }, [key, reload])

  // Refresh when the app comes back to the foreground (phone unlocked, tab
  // re-opened) so the numbers are never quietly stale.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') reload() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [reload])

  // Local updates (optimistic edits) — keeps the cache in step.
  const patch = useCallback((updater) => {
    setData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      store.set(key, next)
      return next
    })
  }, [key])

  return { data, loading, error, reload, setData: patch }
}
