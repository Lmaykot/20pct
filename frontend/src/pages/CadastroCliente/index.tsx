import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { clientesApi } from '../../api/clientes'
import { api } from '../../api/client'
import { Button, Input, Select, TextArea } from '../../design-system/components'
import { usePrivacy } from '../../contexts/PrivacyContext'
import { usePainel } from '../../contexts/PainelContext'
import type { Cliente, PosicaoCliente } from '../../types'
import { useDebounce } from '../../hooks/useDebounce'
import styles from './CadastroCliente.module.css'

const ESTADOS = [
  { value: '', label: 'Selecione…' },
  { value: 'AC', label: 'Acre (AC)' },
  { value: 'AL', label: 'Alagoas (AL)' },
  { value: 'AP', label: 'Amapá (AP)' },
  { value: 'AM', label: 'Amazonas (AM)' },
  { value: 'BA', label: 'Bahia (BA)' },
  { value: 'CE', label: 'Ceará (CE)' },
  { value: 'DF', label: 'Distrito Federal (DF)' },
  { value: 'ES', label: 'Espírito Santo (ES)' },
  { value: 'GO', label: 'Goiás (GO)' },
  { value: 'MA', label: 'Maranhão (MA)' },
  { value: 'MT', label: 'Mato Grosso (MT)' },
  { value: 'MS', label: 'Mato Grosso do Sul (MS)' },
  { value: 'MG', label: 'Minas Gerais (MG)' },
  { value: 'PA', label: 'Pará (PA)' },
  { value: 'PB', label: 'Paraíba (PB)' },
  { value: 'PR', label: 'Paraná (PR)' },
  { value: 'PE', label: 'Pernambuco (PE)' },
  { value: 'PI', label: 'Piauí (PI)' },
  { value: 'RJ', label: 'Rio de Janeiro (RJ)' },
  { value: 'RN', label: 'Rio Grande do Norte (RN)' },
  { value: 'RS', label: 'Rio Grande do Sul (RS)' },
  { value: 'RO', label: 'Rondônia (RO)' },
  { value: 'RR', label: 'Roraima (RR)' },
  { value: 'SC', label: 'Santa Catarina (SC)' },
  { value: 'SP', label: 'São Paulo (SP)' },
  { value: 'SE', label: 'Sergipe (SE)' },
  { value: 'TO', label: 'Tocantins (TO)' },
]

const VAZIO: Omit<Cliente, 'id' | 'created_at'> = {
  nome: '', cpf_cnpj: '', telefone: '', email: '',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  nome_representante: '', observacoes: '',
}

/* Só o CNPJ tem 14 dígitos — usamos isso para rotular a ficha. */
function tipoPessoa(cpfCnpj: string): string {
  const digitos = cpfCnpj.replace(/\D/g, '')
  if (digitos.length > 11) return 'Pessoa jurídica'
  if (digitos.length > 0) return 'Pessoa física'
  return 'Cadastro novo'
}

export function CadastroCliente() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [form, setForm] = useState(VAZIO)
  const [posicao, setPosicao] = useState<PosicaoCliente | null>(null)
  const [municipios, setMunicipios] = useState<string[]>([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const { mask } = usePrivacy()
  const { reload: recarregarPainel } = usePainel()

  const busca = searchParams.get('q') ?? ''
  const buscaDebounced = useDebounce(busca)
  const selecionadoId = searchParams.get('c') ? Number(searchParams.get('c')) : null

  const carregarLista = useCallback(async () => {
    try {
      setClientes(await clientesApi.list(buscaDebounced))
    } catch {
      setErro('Não foi possível carregar os clientes.')
    }
  }, [buscaDebounced])

  useEffect(() => { carregarLista() }, [carregarLista])

  /* Trocar de cliente recarrega ficha e posição juntos. */
  useEffect(() => {
    if (selecionadoId === null) {
      setForm(VAZIO)
      setPosicao(null)
      return
    }
    clientesApi.get(selecionadoId).then(c => setForm({
      nome: c.nome, cpf_cnpj: c.cpf_cnpj, telefone: c.telefone, email: c.email,
      cep: c.cep, logradouro: c.logradouro, numero: c.numero, complemento: c.complemento,
      bairro: c.bairro, cidade: c.cidade, estado: c.estado,
      nome_representante: c.nome_representante, observacoes: c.observacoes,
    })).catch(() => setErro('Não foi possível carregar o cliente.'))

    api.get<PosicaoCliente>(`/painel/cliente/${selecionadoId}`)
      .then(setPosicao)
      .catch(() => setPosicao(null))
  }, [selecionadoId])

  useEffect(() => {
    if (!form.estado) { setMunicipios([]); return }
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${form.estado}/municipios?orderBy=nome`)
      .then(r => r.json())
      .then((data: { nome: string }[]) => setMunicipios(data.map(m => m.nome)))
      .catch(() => setMunicipios([]))
  }, [form.estado])

  const selecionar = (id: number | null) => {
    const proximo = new URLSearchParams(searchParams)
    if (id === null) proximo.delete('c')
    else proximo.set('c', String(id))
    setSearchParams(proximo)
  }

  const buscarCep = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const bruto = e.target.value
    setForm(prev => ({ ...prev, cep: bruto }))
    const digitos = bruto.replace(/\D/g, '')
    if (digitos.length !== 8) return
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digitos}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }))
      }
    } catch {
      /* CEP indisponível: o usuário preenche à mão */
    }
  }

  const salvar = async () => {
    if (!form.nome.trim()) return
    setSalvando(true)
    setErro(null)
    try {
      if (selecionadoId) await clientesApi.update(selecionadoId, form)
      else {
        const criado = await clientesApi.create(form)
        selecionar(criado.id)
      }
      await carregarLista()
      recarregarPainel()
    } catch {
      setErro('Não foi possível salvar o cliente.')
    } finally {
      setSalvando(false)
    }
  }

  const remover = async () => {
    if (!selecionadoId) return
    if (!confirm(`Remover o cadastro de "${form.nome}"?\n\nEssa ação não pode ser desfeita.`)) return
    try {
      await clientesApi.remove(selecionadoId)
      selecionar(null)
      await carregarLista()
      recarregarPainel()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErro(msg.includes('409')
        ? 'Este cliente tem contratos vinculados. Remova os contratos antes.'
        : `Erro ao remover: ${msg}`)
    }
  }

  const campo = (chave: keyof typeof form, rotulo: string, mono = false) => (
    <Input
      label={rotulo}
      mono={mono}
      value={form[chave]}
      onChange={e => setForm(prev => ({ ...prev, [chave]: e.target.value }))}
    />
  )

  return (
    <>
      {erro && <div className={styles.erro}>{erro}</div>}

      <div className={styles.seletor}>
        <span className={styles.seletorLabel}>
          {clientes.length === 1 ? '1 cliente' : `${clientes.length} clientes`}
          {busca && ' na busca'}
        </span>
        <div className={styles.chips}>
          {clientes.slice(0, 12).map(c => (
            <button
              key={c.id}
              type="button"
              className={`${styles.chip} ${c.id === selecionadoId ? styles.chipOn : ''}`}
              onClick={() => selecionar(c.id)}
            >
              {c.nome}
            </button>
          ))}
          {clientes.length > 12 && (
            <span className={styles.chipMais}>
              +{clientes.length - 12} — refine pela busca do topo
            </span>
          )}
        </div>
        <Button variant="secondary" size="sm" tone="accent" onClick={() => selecionar(null)}>
          Novo cliente
        </Button>
      </div>

      <div className={styles.split}>
        <div className={styles.coluna}>
          <section className={styles.bloco}>
            <div className={styles.blocoTopo}>
              <h2 className={styles.blocoTitulo}>Identificação</h2>
              <span className={styles.blocoNota}>{tipoPessoa(form.cpf_cnpj)}</span>
            </div>
            <div className={styles.gridIdentificacao}>
              <div className={styles.span2}>{campo('nome', 'Nome / Razão social')}</div>
              {campo('cpf_cnpj', 'CPF / CNPJ', true)}
              {campo('telefone', 'Telefone')}
              {campo('email', 'E-mail')}
              {campo('nome_representante', 'Representante legal')}
            </div>
          </section>

          <section className={styles.bloco}>
            <div className={styles.blocoTopo}>
              <h2 className={styles.blocoTitulo}>Endereço</h2>
              <span className={styles.blocoNota}>Preenchido pelo CEP</span>
            </div>
            <div className={styles.gridEndereco}>
              <Input label="CEP" mono value={form.cep} onChange={buscarCep} />
              <div className={styles.logradouro}>{campo('logradouro', 'Logradouro')}</div>
              {campo('numero', 'Número')}
              <div className={styles.span2}>{campo('complemento', 'Complemento')}</div>
              {campo('bairro', 'Bairro')}
              <Select
                label="UF"
                options={ESTADOS}
                value={form.estado}
                onChange={e => setForm(prev => ({ ...prev, estado: e.target.value }))}
              />
              <div className={styles.span2}>
                <Select
                  label="Município"
                  options={[
                    { value: '', label: municipios.length ? 'Selecione…' : 'Escolha a UF primeiro' },
                    /* Município gravado que não bate com a lista do IBGE
                       (acentuação, grafia antiga) entra como opção própria —
                       sem isso o Select o descartaria silenciosamente ao salvar. */
                    ...(form.cidade && !municipios.includes(form.cidade)
                      ? [{ value: form.cidade, label: `${form.cidade} (fora da lista)` }]
                      : []),
                    ...municipios.map(m => ({ value: m, label: m })),
                  ]}
                  value={form.cidade}
                  onChange={e => setForm(prev => ({ ...prev, cidade: e.target.value }))}
                />
              </div>
            </div>
          </section>

          <section className={styles.bloco}>
            <div className={styles.blocoTopo}>
              <h2 className={styles.blocoTitulo}>Observações</h2>
              <span className={styles.blocoNota}>Notas internas do escritório</span>
            </div>
            <TextArea
              value={form.observacoes}
              onChange={e => setForm(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Anotações que ajudam quem for atender este cliente…"
            />
          </section>

          <div className={styles.acoes}>
            {selecionadoId && (
              <Button variant="secondary" onClick={remover}>Remover</Button>
            )}
            <div className={styles.acoesEspaco} />
            <Button variant="secondary" size="lg" onClick={() => selecionar(null)}>
              Cancelar
            </Button>
            <Button size="lg" onClick={salvar} disabled={salvando || !form.nome.trim()}>
              {salvando ? 'Salvando…' : 'Salvar cliente'}
            </Button>
          </div>
        </div>

        <aside className={styles.lateral}>
          <div className={styles.cartao}>
            <div className={styles.cartaoLabel}>Posição do cliente</div>
            <div className={styles.linhas}>
              <div className={styles.linha}>
                <span className={styles.linhaChave}>Contratos ativos</span>
                <span className={styles.linhaValor}>{posicao?.contratos_ativos ?? '—'}</span>
              </div>
              <div className={styles.linha}>
                <span className={styles.linhaChave}>Contratado</span>
                <span className={styles.linhaValor}>
                  {posicao ? mask(posicao.contratado) : '—'}
                </span>
              </div>
              <div className={styles.linha}>
                <span className={styles.linhaChave}>Em aberto</span>
                <span className={`${styles.linhaValor} ${styles.ambar}`}>
                  {posicao ? mask(posicao.aberto) : '—'}
                </span>
              </div>
              <div className={styles.linha}>
                <span className={styles.linhaChave}>Atrasos</span>
                <span className={styles.linhaValor}>
                  {posicao ? (posicao.atrasos === 'Nenhum' ? 'Nenhum' : mask(posicao.atrasos)) : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.cartao}>
            <div className={styles.cartaoLabel}>Histórico</div>
            {/* Não há log de eventos no sistema — a coluna fica vazia
                em vez de exibir algo inventado. */}
            <div className={styles.historicoVazio}>
              O sistema ainda não registra histórico de eventos deste cliente.
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}
