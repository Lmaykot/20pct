import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface PrivacyContextValue {
  /** Quando ligado, todo valor monetário aparece mascarado. */
  hidden: boolean
  toggleHidden: () => void
  /** Passe qualquer valor formatado por aqui antes de exibir. */
  mask: (valor: string) => string
}

const PrivacyContext = createContext<PrivacyContextValue>({
  hidden: false,
  toggleHidden: () => {},
  mask: v => v,
})

export function usePrivacy() {
  return useContext(PrivacyContext)
}

const STORAGE_KEY = 'valoresOcultos'

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, hidden ? '1' : '0')
    } catch {
      /* navegação privativa: a preferência só não persiste */
    }
  }, [hidden])

  const value: PrivacyContextValue = {
    hidden,
    toggleHidden: () => setHidden(h => !h),
    mask: valor => (hidden ? 'R$ ••••••' : valor),
  }

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>
}
