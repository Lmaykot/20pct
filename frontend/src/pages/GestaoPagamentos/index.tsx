import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { KpiCard, Section } from '../../design-system/components'
import { baixasApi } from '../../api/parcelas'
import { api } from '../../api/client'
import { usePrivacy } from '../../contexts/PrivacyContext'
import { usePainel } from '../../contexts/PainelContext'
import type { Pagamentos, PainelParcela } from '../../types'
import { ParcelasEditor } from './ParcelasEditor'
import styles from './GestaoPagamentos.module.css'

/* A cor do ponto ao lado do vencimento resume a situação da parcela
   sem gastar uma coluna — é o padrão do design. */
function corDaSituacao(p: PainelParcela): string {
  if (p.situacao === 'Baixada') return 'var(--grn)'
  if (p.situacao === 'Em atraso') return 'var(--red)'
  if (p.situacao.startsWith('Vence em')) return 'var(--amb)'
  return 'var(--bdStrong)'
}

export function GestaoPagamentos() {
  const [dados, setDados] = useState<Pagamentos | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [emEdicao, setEmEdicao] = useState<number | null>(null)
  const [processando, setProcessando] = useState<number | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const { mask } = usePrivacy()
  const { reload: recarregarPainel } = usePainel()

  const busca = (searchParams.get('q') ?? '').trim().toLowerCase()

  const carregar = useCallback(() => {
    setLoading(true)
    api.get<Pagamentos>('/painel/parcelas')
      .then(d => { setDados(d); setErro(null) })
      .catch(() => setErro('Não foi possível carregar as parcelas.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { carregar() }, [carregar])

  /* Link vindo da ficha do contrato: /pagamentos?h=<honorario_id> */
  useEffect(() => {
    const h = searchParams.get('h')
    if (h) {
      setEmEdicao(Number(h))
      const proximo = new URLSearchParams(searchParams)
      proximo.delete('h')
      setSearchParams(proximo, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const visiveis = useMemo(() => {
    if (!dados) return []
    if (!busca) return dados.parcelas
    return dados.parcelas.filter(p =>
      p.cliente_nome.toLowerCase().includes(busca) ||
      p.ctt_n.toLowerCase().includes(busca) ||
      p.hipotese.toLowerCase().includes(busca))
  }, [dados, busca])

  const alternarBaixa = async (p: PainelParcela) => {
    setProcessando(p.parcela_id)
    try {
      if (p.situacao === 'Baixada') await baixasApi.estornar(p.parcela_id)
      else await baixasApi.registrar(p.parcela_id)
      carregar()
      recarregarPainel()
    } catch {
      setErro('Não foi possível registrar a baixa.')
    } finally {
      setProcessando(null)
    }
  }

  return (
    <>
      {erro && <div className={styles.erro}>{erro}</div>}

      <div className={styles.kpis}>
        {dados?.kpis.map(k => (
          <KpiCard key={k.label} label={k.label} value={mask(k.valor)} hint={k.hint} />
        ))}
      </div>

      <Section
        flush
        title="Parcelas em aberto"
        note="Baixa manual ou por conciliação bancária"
      >
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Vencimento</th>
                <th>Contrato</th>
                <th>Cliente · hipótese</th>
                <th>Parcela</th>
                <th className={styles.right}>Valor</th>
                <th className={styles.right}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className={styles.empty}>Carregando parcelas…</td></tr>
              ) : visiveis.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.empty}>
                    {busca
                      ? 'Nenhuma parcela corresponde à busca.'
                      : 'Nenhuma parcela em aberto.'}
                  </td>
                </tr>
              ) : visiveis.map(p => {
                const baixada = p.situacao === 'Baixada'
                return (
                  <tr key={p.parcela_id}>
                    <td>
                      <div className={styles.venc}>
                        <span className={styles.dot}
                          style={{ background: corDaSituacao(p) }}
                          title={p.situacao} />
                        <span className={styles.mono}>{p.vencimento}</span>
                      </div>
                    </td>
                    <td className={styles.contrato}>{p.ctt_n}</td>
                    <td className={styles.clienteCelula}>
                      <button type="button" className={styles.hipoteseBtn}
                        onClick={() => setEmEdicao(p.honorario_id)}
                        title="Abrir o parcelamento desta hipótese">
                        {p.cliente_nome}
                        <span className={styles.hipotese}> · {p.hipotese}</span>
                      </button>
                    </td>
                    <td className={styles.parcelaNum}>{p.parcela}</td>
                    <td className={`${styles.mono} ${styles.right}`}>{mask(p.valor)}</td>
                    <td className={styles.right}>
                      <button
                        type="button"
                        className={`${styles.baixaBtn} ${baixada ? styles.baixada : ''}`}
                        disabled={processando === p.parcela_id}
                        onClick={() => alternarBaixa(p)}
                        title={baixada ? 'Clique para estornar a baixa' : undefined}
                      >
                        {processando === p.parcela_id
                          ? '…'
                          : baixada ? 'Baixada' : 'Registrar baixa'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <ParcelasEditor
        honorarioId={emEdicao}
        onClose={() => setEmEdicao(null)}
        onSaved={() => { carregar(); recarregarPainel() }}
      />
    </>
  )
}
