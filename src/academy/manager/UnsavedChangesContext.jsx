import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export const UNSAVED_CHANGES_MESSAGE =
  'Bu ekrandaki değişiklikler kaybedilecek. Devam etmek istediğinize emin misiniz?'

const UnsavedChangesContext = createContext({
  isDirty: false,
  setDirty: () => {},
})

export function UnsavedChangesProvider({ children }) {
  const [isDirty, setIsDirty] = useState(false)
  const setDirty = useCallback((value) => {
    setIsDirty(Boolean(value))
  }, [])
  const value = useMemo(() => ({ isDirty, setDirty }), [isDirty, setDirty])

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
    </UnsavedChangesContext.Provider>
  )
}

export function useUnsavedChanges() {
  return useContext(UnsavedChangesContext)
}

export function useRegisterUnsavedChanges(isDirty) {
  const { setDirty } = useUnsavedChanges()

  useEffect(() => {
    setDirty(isDirty)
    return () => setDirty(false)
  }, [isDirty, setDirty])
}
