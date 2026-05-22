import { useState, useEffect, useCallback } from 'react'
import { clientesApi } from '../../api/clientes'
import { Card, Button, Input, TextArea, SearchInput, DataTable, SectionHeader, Select } from '../../design-system/components'
import type { Column } from '../../design-system/components'
import type { Cliente } from '../../types'
import { useDebounce } from '../../hooks/useDebounce'
import styles from './CadastroCliente.module.css'

const ESTADOS = [
  { value: '', label: 'Selecione...' },
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

const EMPTY: Omit<Cliente, 'id' | 'created_at'> = {
  nome: '', cpf_cnpj: '', telefone: '', email: '',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  nome_representante: '', observacoes: '',
}

export function CadastroCliente() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [municipios, setMunicipios] = useState<string[]>([])
  const [loadingCep, setLoadingCep] = useState(false)

  const loadList = useCallback(async () => {
    const data = await clientesApi.list(debouncedSearch)
    setClientes(data)
  }, [debouncedSearch])

  useEffect(() => { loadList() }, [loadList])

  useEffect(() => {
    if (!form.estado) {
      setMunicipios([])
      return
    }
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${form.estado}/municipios?orderBy=nome`)
      .then(r => r.json())
      .then((data: { nome: string }[]) => setMunicipios(data.map(m => m.nome)))
      .catch(() => setMunicipios([]))
  }, [form.estado])

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setForm(prev => ({ ...prev, cep: raw }))
    const digits = raw.replace(/\D/g, '')
    if (digits.length !== 8) return
    setLoadingCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
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
      // silently ignore lookup failures
    } finally {
      setLoadingCep(false)
    }
  }

  const handleSelect = async (c: Cliente) => {
    setSelectedId(c.id)
    const full = await clientesApi.get(c.id)
    setForm({
      nome: full.nome, cpf_cnpj: full.cpf_cnpj, telefone: full.telefone,
      email: full.email, cep: full.cep, logradouro: full.logradouro,
      numero: full.numero, complemento: full.complemento, bairro: full.bairro,
      cidade: full.cidade, estado: full.estado, nome_representante: full.nome_representante,
      observacoes: full.observacoes,
    })
  }

  const handleNew = () => {
    setSelectedId(null)
    setForm(EMPTY)
  }

  const handleCancel = () => {
    setSelectedId(null)
    setForm(EMPTY)
  }

  const handleSave = async () => {
    if (!form.nome.trim()) return
    setSaving(true)
    try {
      if (selectedId) {
        await clientesApi.update(selectedId, form)
      } else {
        const created = await clientesApi.create(form)
        setSelectedId(created.id)
      }
      await loadList()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedId) return
    if (!confirm(`Remover o cadastro de "${form.nome}"?\n\nEssa ação não pode ser desfeita.`)) return
    try {
      await clientesApi.remove(selectedId)
      setSelectedId(null)
      setForm(EMPTY)
      await loadList()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('409')) {
        alert('Este cliente possui contratos vinculados. Remova os contratos antes.')
      } else {
        alert(`Erro ao remover: ${msg}`)
      }
    }
  }

  const field = (key: keyof typeof form, label: string) => (
    <Input
      label={label}
      value={form[key]}
      onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
    />
  )

  const columns: Column<Cliente>[] = [
    { key: 'nome', header: 'Nome' },
    { key: 'cpf_cnpj', header: 'CPF/CNPJ', width: '140px' },
  ]

  return (
    <div>
      <h1 className={styles.pageTitle}>Cadastro de Clientes</h1>
      <div className={styles.page}>
        <div className={styles.listPanel}>
          <div className={styles.listHeader}>
            <SearchInput
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar cliente..."
              style={{ flex: 1 }}
            />
            <Button size="sm" onClick={handleNew}>+ Novo</Button>
          </div>
          <Card flush className={styles.listScroll}>
            <DataTable
              columns={columns}
              data={clientes}
              rowKey={r => r.id}
              selectedKey={selectedId}
              onRowClick={handleSelect}
            />
          </Card>
        </div>

        <Card className={styles.formPanel}>
          <div className={styles.section}>
            <SectionHeader text="Dados Principais" />
            <div className={styles.formGrid}>
              <div className={styles.fullWidth}>{field('nome', 'Nome')}</div>
              {field('cpf_cnpj', 'CPF / CNPJ')}
              {field('telefone', 'Telefone')}
              {field('email', 'E-mail')}
            </div>
          </div>

          <div className={styles.section}>
            <SectionHeader text="Endereco" />
            <div className={styles.formGrid}>
              <Input
                label="CEP"
                value={form.cep}
                onChange={handleCepChange}
                disabled={loadingCep}
                placeholder="00000-000"
              />
              <div className={styles.fullWidth}>{field('logradouro', 'Logradouro')}</div>
              {field('numero', 'Numero')}
              {field('complemento', 'Complemento')}
              <div className={styles.fullWidth}>{field('bairro', 'Bairro')}</div>
              <Select
                label="Estado"
                value={form.estado}
                options={ESTADOS}
                onChange={e => setForm(prev => ({ ...prev, estado: e.target.value, cidade: '' }))}
              />
              <Select
                label="Município"
                value={form.cidade}
                options={[
                  { value: '', label: municipios.length === 0 ? 'Selecione um estado...' : 'Selecione...' },
                  ...municipios.map(m => ({ value: m, label: m })),
                ]}
                onChange={e => setForm(prev => ({ ...prev, cidade: e.target.value }))}
                disabled={municipios.length === 0}
              />
            </div>
          </div>

          <div className={styles.section}>
            <SectionHeader text="Representante Legal (PJ)" />
            <div className={styles.formGrid}>
              <div className={styles.fullWidth}>{field('nome_representante', 'Nome do Representante')}</div>
            </div>
          </div>

          <div className={styles.section}>
            <SectionHeader text="Observacoes" />
            <TextArea
              value={form.observacoes}
              onChange={e => setForm(prev => ({ ...prev, observacoes: e.target.value }))}
              rows={4}
            />
          </div>

          <div className={styles.actions}>
            <Button variant="secondary" onClick={handleCancel}>Cancelar</Button>
            {selectedId && (
              <Button variant="danger" onClick={handleDelete} disabled={saving}>
                Remover
              </Button>
            )}
            <Button onClick={handleSave} disabled={saving || !form.nome.trim()}>
              {saving ? 'Salvando...' : 'Salvar Cadastro'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
