import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

// Drives a single piece of page state from a URL search param, so the sidebar
// sub-navigation and the page's in-page tabs share one source of truth. Reads
// fall back to `defaultValue` when the param is absent; writes replace history
// so switching sections in-page doesn't pile up back-button entries.
export function useSearchParamState(paramKey, defaultValue) {
  const [searchParams, setSearchParams] = useSearchParams()
  const value = searchParams.get(paramKey) ?? defaultValue

  const setValue = useCallback(
    (next) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          params.set(paramKey, next)
          return params
        },
        { replace: true },
      )
    },
    [paramKey, setSearchParams],
  )

  return [value, setValue]
}
