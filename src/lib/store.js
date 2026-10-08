import { useEffect, useState } from 'react'

export function readJSON(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key))
    return v ?? fallback
  } catch {
    return fallback
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* opslag vol of geblokkeerd — de app werkt door zonder te onthouden */
  }
}

// useState dat zichzelf in localStorage bewaart.
export function useStored(key, initial) {
  const [value, setValue] = useState(() => readJSON(key, initial))
  useEffect(() => writeJSON(key, value), [key, value])
  return [value, setValue]
}
