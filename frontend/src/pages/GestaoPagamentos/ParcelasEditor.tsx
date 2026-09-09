import { useCallback, useEffect, useState } from 'react'
import { Button, Input, Modal } from '../../design-system/components'
import { honorariosApi } from '../../api/honorarios'
import { parcelasApi } from '../../api/parcelas'
import { TIPO_LABELS } from '../../types'
import styles from './GestaoPagamentos.module.css'

interface ParcelaForm {
  num: number
  valor: string
  vencimento: string
  nota_fiscal: string
  data_pagamento: string
}

interface ParcelasEditorProps {
  honorarioId: number | null
  onClose: () => void
  onSaved: () => void
}

/* A agenda resolve o dia a dia (baixar uma parcela). Programar o
   parcelamento — criar, mudar valor, vencimento, nota — continua
   sendo necessário, e é o que este editor faz. */
export function ParcelasEditor({ honorarioId, onClose, onSaved }: ParcelasEditorProps) {
  const [titulo, setTitulo] = useState('')
  const [parcelas, setParcelas] = useState<ParcelaForm[]>([])
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(false)

  const carregar = useCallback(async () => {
    if (!honorarioId) return
    setCarregando(true)
    try {
      const [honorario, lista] = await Promise.all([
        honorariosApi.get(honorarioId),
        parcelasApi.get(honorarioId),
      ])
      setTitulo(`${TIPO_LABELS[honorario.tipo] ?? honorario.tipo}${
        honorario.hipotese ? ` · ${honorario.hipotese}` : ''}`)
      setParcelas(lista.map(p => ({
        num: p.num_parcela,
        valor: p.valor,
        vencimento: p.vencimento,
        nota_fiscal: p.nota_fiscal,
        data_pagamento: p.data_pagamento,
      })))
    } finally {
      setCarregando(false)
    }
  }, [honorarioId])

  useEffect(() => { carregar() }, [carregar])

  const atualizar = (idx: number, campo: keyof ParcelaForm, valor: string) =>
    setParcelas(prev => prev.map((p, i) => (i === idx ? { ...p, [campo]: valor } : p)))

  const adicionar = () =>
    setParcelas(prev => [...prev, {
      num: prev.length + 1, valor: '', vencimento: '', nota_fiscal: '', data_pagamento: '',
    }])

  const remover = (idx: number) =>
    setParcelas(prev => prev
      .filter((_, i) => i !== idx)
      .map((p, i) => ({ ...p, num: i + 1 })))

  const salvar = async () => {
    if (!honorarioId) return
    setSalvando(true)
    try {
      await parcelasApi.save(honorarioId, parcelas)
      onSaved()
      onClose()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      wide
      open={honorarioId !== null}
      onClose={onClose}
      title={titulo || 'Parcelamento'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar parcelamento'}
          </Button>
        </>
      }
    >
      {carregando ? (
        <div className={styles.editorVazio}>Carregando parcelas…</div>
      ) : (
        <>
          <div className={styles.editorTabela}>
            <div className={styles.editorCabecalho}>
              <span>#</span>
              <span>Valor</span>
              <span>Vencimento</span>
              <span>Nota fiscal</span>
              <span>Pagamento</span>
              <span />
            </div>

            {parcelas.length === 0 && (
              <div className={styles.editorVazio}>
                Nenhuma parcela programada para esta hipótese.
              </div>
            )}

            {parcelas.map((p, idx) => (
              <div key={idx} className={styles.editorLinha}>
                <span className={styles.editorNum}>{p.num}</span>
                <Input value={p.valor} mono placeholder="R$ 0,00"
                  onChange={e => atualizar(idx, 'valor', e.target.value)} />
                <Input type="date" value={p.vencimento} mono
                  onChange={e => atualizar(idx, 'vencimento', e.target.value)} />
                <Input value={p.nota_fiscal} placeholder="—"
                  onChange={e => atualizar(idx, 'nota_fiscal', e.target.value)} />
                <Input type="date" value={p.data_pagamento} mono
                  onChange={e => atualizar(idx, 'data_pagamento', e.target.value)} />
                <button type="button" className={styles.editorRemover}
                  onClick={() => remover(idx)} aria-label={`Remover parcela ${p.num}`}>
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className={styles.editorAcoes}>
            <Button variant="secondary" size="sm" tone="accent" onClick={adicionar}>
              Adicionar parcela
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}
