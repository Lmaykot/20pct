import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react'
import { api } from '../api/client'
import type { Painel } from '../types'

interface PainelContextValue {
  painel: Painel | null
  loading: boolean
  /** Chame depois de qualquer baixa ou cadastro para refrescar contadores. */
  reload: () => void
}

const PainelContext = createContext<PainelContextValue>({
  painel: null,
  loading: true,
  reload: () => {},
})

export function usePainel() {
  return useContext(PainelContext)
}

/* Uma única leitura de /api/painel serve a sidebar (contadores),
   o header (subtítulos) e a própria tela de painel. */
export function PainelProvider({ children }: { children: ReactNode }) {
  const [painel, setPainel] = useState<Painel | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    setLoading(true)
    api.get<Painel>('/painel')
      .then(setPainel)
      .catch(() => setPainel(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { reload() }, [reload])

  return (
    <PainelContext.Provider value={{ painel, loading, reload }}>
      {children}
    </PainelContext.Provider>
  )
}
