import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { contratosApi } from '../../api/contratos'
import { clientesApi } from '../../api/clientes'
import { Button, Input, Select, TextArea } from '../../design-system/components'
import { HonorariosDialog } from '../HonorariosDialog/HonorariosDialog'
import { usePainel } from '../../contexts/PainelContext'
import type { Cliente } from '../../types'
import { CONTRATO_STATUS, CONTRATO_TIPOS } from '../../types'
import styles from './CadastroContrato.module.css'

const VAZIO = {
  ctt_n: '', descricao: '', tipo: 'Contencioso',
  observacoes: '', data_assinatura: '', status: 'Ativo', arquivo_path: '',
}

/** Campo de busca com sugestões — usado para cliente principal e adicionais. */
function BuscaCliente({
  valor, onDigitar, onEscolher, placeholder, label,
}: {
  valor: string
  onDigitar: (q: string) => void
  onEscolher: (c: Cliente) => void
  placeholder?: string
  label?: string
}) {
  const [resultados, setResultados] = useState<Cliente[]>([])
  const [aberto, setAberto] = useState(false)

  const buscar = async (q: string) => {
    onDigitar(q)
    if (q.trim().length < 2) { setResultados([]); setAberto(false); return }
    try {
      setResultados(await clientesApi.list(q))
      setAberto(true)
    } catch {
      setResultados([])
    }
  }

  return (
    <div className={styles.autocomplete}>
      <Input
        label={label}
        value={valor}
        placeholder={placeholder}
        onChange={e => buscar(e.target.value)}
        onFocus={() => resultados.length > 0 && setAberto(true)}
        onBlur={() => window.setTimeout(() => setAberto(false), 150)}
      />
      {aberto && resultados.length > 0 && (
        <div className={styles.sugestoes}>
          {resultados.slice(0, 8).map(c => (
            <button
              key={c.id}
              type="button"
              className={styles.sugestao}
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onEscolher(c); setAberto(false) }}
            >
              <span className={styles.sugestaoNome}>{c.nome}</span>
              {c.cpf_cnpj && <span className={styles.sugestaoDoc}>{c.cpf_cnpj}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function CadastroContrato() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { reload: recarregarPainel } = usePainel()
  const editandoId = id ? Number(id) : null

  const [form, setForm] = useState(VAZIO)
  const [clienteId, setClienteId] = useState<number | null>(null)
  const [clienteNome, setClienteNome] = useState('')
  const [extras, setExtras] = useState<Cliente[]>([])
  const [buscaExtra, setBuscaExtra] = useState('')
  const [advogados, setAdvogados] = useState<string[]>([])
  const [advogadoInput, setAdvogadoInput] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [honorariosAberto, setHonorariosAberto] = useState(false)
  const inputArquivo = useRef<HTMLInputElement>(null)

  const carregar = useCallback(async () => {
    if (editandoId) {
      const c = await contratosApi.get(editandoId)
      setForm({
        ctt_n: c.ctt_n, descricao: c.descricao, tipo: c.tipo || 'Contencioso',
        observacoes: c.observacoes, data_assinatura: c.data_assinatura,
        status: c.status, arquivo_path: c.arquivo_path,
      })
      setClienteId(c.cliente_id)
      setClienteNome(c.cliente_nome)
      setExtras(await contratosApi.getClientes(editandoId))
      setAdvogados(await contratosApi.getAdvogados(editandoId))
    } else {
      const { ctt_n } = await contratosApi.nextCttN()
      setForm({ ...VAZIO, ctt_n })
      setClienteId(null)
      setClienteNome('')
      setExtras([])
      setAdvogados([])
    }
  }, [editandoId])

  useEffect(() => { carregar().catch(() => setErro('Não foi possível carregar o contrato.')) }, [carregar])

  const set = (chave: keyof typeof form) =>
    (e: { target: { value: string } }) => setForm(f => ({ ...f, [chave]: e.target.value }))

  const adicionarAdvogado = () => {
    const nome = advogadoInput.trim()
    if (!nome || advogados.includes(nome)) return
    setAdvogados(prev => [...prev, nome])
    setAdvogadoInput('')
  }

  const salvar = async (definirHonorarios = false) => {
    if (!form.ctt_n.trim() || !clienteId) {
      setErro('Informe o número do contrato e o cliente principal.')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      const payload = {
        ctt_n: form.ctt_n,
        descricao: form.descricao,
        tipo: form.tipo,
        advogado: advogados.join(', '),
        observacoes: form.observacoes,
        data_assinatura: form.data_assinatura,
        status: form.status,
        arquivo_path: form.arquivo_path,
      }

      const contratoId = editandoId
        ? (await contratosApi.update(editandoId, payload), editandoId)
        : (await contratosApi.create({ ...payload, cliente_id: clienteId })).id

      await contratosApi.setClientes(contratoId, extras.map(c => c.id))
      await contratosApi.setAdvogados(contratoId, advogados)
      recarregarPainel()

      if (definirHonorarios) {
        if (!editandoId) navigate(`/contratos/${contratoId}/editar`, { replace: true })
        setHonorariosAberto(true)
      } else {
        navigate(`/contratos/${contratoId}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('409')) setErro(`O número "${form.ctt_n}" já está em uso.`)
      else if (msg.includes('500')) setErro('Erro ao salvar — verifique o PDF anexado.')
      else setErro('Erro ao salvar o contrato.')
    } finally {
      setSalvando(false)
    }
  }

  const enviarPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0]
    if (!arquivo || !editandoId) return
    try {
      const r = await contratosApi.uploadPdf(editandoId, arquivo)
      setForm(prev => ({ ...prev, arquivo_path: r.arquivo_path }))
    } catch {
      setErro('Erro ao enviar o PDF.')
    } finally {
      e.target.value = ''
    }
  }

  const removerPdf = async () => {
    if (!editandoId) return
    await contratosApi.removePdf(editandoId)
    setForm(prev => ({ ...prev, arquivo_path: '' }))
  }

  const excluir = async () => {
    if (!editandoId) return
    if (!confirm(`Remover o contrato ${form.ctt_n}?\n\nHonorários, parcelas e PDF anexado também serão apagados. Essa ação não pode ser desfeita.`)) return
    try {
      await contratosApi.remove(editandoId)
      recarregarPainel()
      navigate('/contratos')
    } catch (err) {
      setErro(`Erro ao remover: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <div className={styles.page}>
      {erro && <div className={styles.erro}>{erro}</div>}

      <section className={styles.bloco}>
        <div className={styles.blocoTopo}>
          <h2 className={styles.blocoTitulo}>Dados do contrato</h2>
          <span className={styles.blocoNota}>
            {editandoId ? 'Edição' : 'Número sugerido automaticamente'}
          </span>
        </div>
        <div className={styles.grid}>
          <Input label="CTT-N" mono value={form.ctt_n} onChange={set('ctt_n')} />
          <Input label="Data de assinatura" type="date" mono
            value={form.data_assinatura} onChange={set('data_assinatura')} />
          <Select label="Tipo" value={form.tipo} onChange={set('tipo')}
            options={CONTRATO_TIPOS.map(t => ({ value: t, label: t }))} />
          <Select label="Status" value={form.status} onChange={set('status')}
            options={CONTRATO_STATUS.map(s => ({ value: s, label: s }))} />
        </div>
      </section>

      <section className={styles.bloco}>
        <div className={styles.blocoTopo}>
          <h2 className={styles.blocoTitulo}>Partes</h2>
          <span className={styles.blocoNota}>Um cliente principal, quantos coadjuvantes precisar</span>
        </div>
        <div className={styles.grid}>
          <div className={styles.span2}>
            <BuscaCliente
              label="Cliente principal"
              valor={clienteNome}
              placeholder="Digite ao menos duas letras…"
              onDigitar={q => { setClienteNome(q); if (!q) setClienteId(null) }}
              onEscolher={c => { setClienteId(c.id); setClienteNome(c.nome) }}
            />
          </div>
          <div className={styles.span2}>
            <BuscaCliente
              label="Adicionar outro cliente"
              valor={buscaExtra}
              placeholder="Buscar cliente…"
              onDigitar={setBuscaExtra}
              onEscolher={c => {
                if (c.id !== clienteId && !extras.some(e => e.id === c.id)) {
                  setExtras(prev => [...prev, c])
                }
                setBuscaExtra('')
              }}
            />
          </div>
        </div>
        {extras.length > 0 && (
          <div className={styles.tags}>
            {extras.map(c => (
              <span key={c.id} className={styles.tag}>
                {c.nome}
                <button type="button" onClick={() => setExtras(prev => prev.filter(e => e.id !== c.id))}
                  aria-label={`Remover ${c.nome}`}>✕</button>
              </span>
            ))}
          </div>
        )}
      </section>

      <section className={styles.bloco}>
        <div className={styles.blocoTopo}>
          <h2 className={styles.blocoTitulo}>Advogados</h2>
          <span className={styles.blocoNota}>Responsáveis pelo contrato</span>
        </div>
        <div className={styles.linhaAdvogado}>
          <Input
            value={advogadoInput}
            placeholder="Nome do advogado"
            onChange={e => setAdvogadoInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionarAdvogado() } }}
          />
          <Button variant="secondary" size="lg" tone="accent" onClick={adicionarAdvogado}>
            Adicionar
          </Button>
        </div>
        {advogados.length > 0 && (
          <div className={styles.tags}>
            {advogados.map((nome, i) => (
              <span key={nome} className={styles.tag}>
                {nome}
                <button type="button" onClick={() => setAdvogados(prev => prev.filter((_, j) => j !== i))}
                  aria-label={`Remover ${nome}`}>✕</button>
              </span>
            ))}
          </div>
        )}
      </section>

      <section className={styles.bloco}>
        <div className={styles.blocoTopo}>
          <h2 className={styles.blocoTitulo}>Objeto e observações</h2>
        </div>
        <div className={styles.campos}>
          <TextArea label="Descrição" value={form.descricao} onChange={set('descricao')}
            placeholder="Objeto do contrato…" />
          <TextArea label="Observações" value={form.observacoes} onChange={set('observacoes')}
            placeholder="Notas internas…" />
        </div>
      </section>

      <section className={styles.bloco}>
        <div className={styles.blocoTopo}>
          <h2 className={styles.blocoTitulo}>Documento do contrato</h2>
          <span className={styles.blocoNota}>
            {editandoId ? 'PDF assinado' : 'Disponível depois de salvar'}
          </span>
        </div>
        <div className={styles.documento}>
          {form.arquivo_path ? (
            <>
              <span className={styles.arquivoNome}>{form.arquivo_path.split(/[\\/]/).pop()}</span>
              <div className={styles.documentoAcoes}>
                <a className={styles.pdfLink} href={`/api/contratos/${editandoId}/pdf`}
                  target="_blank" rel="noreferrer">Baixar PDF</a>
                <Button variant="secondary" size="sm" onClick={removerPdf}>Remover</Button>
              </div>
            </>
          ) : (
            <>
              <span className={styles.semArquivo}>Nenhum PDF anexado.</span>
              <Button variant="secondary" size="sm" tone="accent" disabled={!editandoId}
                onClick={() => inputArquivo.current?.click()}>
                Anexar PDF
              </Button>
            </>
          )}
          <input ref={inputArquivo} type="file" accept="application/pdf"
            onChange={enviarPdf} hidden />
        </div>
      </section>

      <div className={styles.acoes}>
        {editandoId && <Button variant="secondary" onClick={excluir}>Remover contrato</Button>}
        <div className={styles.espaco} />
        <Button variant="secondary" size="lg"
          onClick={() => navigate(editandoId ? `/contratos/${editandoId}` : '/contratos')}>
          Cancelar
        </Button>
        <Button variant="secondary" size="lg" tone="accent"
          onClick={() => salvar(true)} disabled={salvando}>
          Salvar e definir honorários
        </Button>
        <Button size="lg" onClick={() => salvar(false)} disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar contrato'}
        </Button>
      </div>

      <HonorariosDialog
        open={honorariosAberto}
        contratoId={editandoId}
        onClose={() => {
          setHonorariosAberto(false)
          if (editandoId) navigate(`/contratos/${editandoId}`)
        }}
      />
    </div>
  )
}
