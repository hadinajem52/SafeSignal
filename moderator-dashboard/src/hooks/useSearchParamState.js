import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

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
