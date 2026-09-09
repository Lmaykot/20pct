import { useState } from 'react'
import { Tabs } from '../../design-system/components'
import { Exportacao } from './Exportacao'
import { Usuarios } from './Usuarios'

type Aba = 'exportacao' | 'usuarios'

const ABAS: { key: Aba; label: string }[] = [
  { key: 'exportacao', label: 'Exportação' },
  { key: 'usuarios', label: 'Usuários e permissões' },
]

export function Configuracoes() {
  const [aba, setAba] = useState<Aba>('exportacao')

  return (
    <>
      <Tabs tabs={ABAS} value={aba} onChange={setAba} />
      {aba === 'exportacao' ? <Exportacao /> : <Usuarios />}
    </>
  )
}
