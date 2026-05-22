import { useState, useEffect, useCallback, useRef } from 'react'
import { contratosApi } from '../../api/contratos'
import { clientesApi } from '../../api/clientes'
import { Card, Button, Input, TextArea, Select, SearchInput, DataTable, SectionHeader, StatusChip } from '../../design-system/components'
import type { Column } from '../../design-system/components'
import { HonorariosDialog } from '../HonorariosDialog/HonorariosDialog'
import type { Contrato, Cliente } from '../../types'
import { CONTRATO_TIPOS, CONTRATO_STATUS } from '../../types'
import { useDebounce } from '../../hooks/useDebounce'
import styles from './CadastroContrato.module.css'

const EMPTY_FORM = {
  ctt_n: '', descricao: '', tipo: 'Contencioso',
  observacoes: '', data_assinatura: '', status: 'Ativo', arquivo_path: '',
}

export function CadastroContrato() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [originalCttN, setOriginalCttN] = useState('')
  const [editingCttN, setEditingCttN] = useState(false)
  const [clienteId, setClienteId] = useState<number | null>(null)
  const [clienteNome, setClienteNome] = useState('')
  const [clienteResults, setClienteResults] = useState<Cliente[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [extraClientes, setExtraClientes] = useState<Cliente[]>([])
  const [extraSearch, setExtraSearch] = useState('')
  const [extraResults, setExtraResults] = useState<Cliente[]>([])
  const [showExtraDropdown, setShowExtraDropdown] = useState(false)
  const [advogados, setAdvogados] = useState<string[]>([])
  const [advogadoInput, setAdvogadoInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const [cttNError, setCttNError] = useState('')
  const [honorariosOpen, setHonorariosOpen] = useState(false)
  const [honorariosContratoId, setHonorariosContratoId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadList = useCallback(async () => {
    const data = await contratosApi.list({ cliente_nome: debouncedSearch })
    setContratos(data)
  }, [debouncedSearch])

  useEffect(() => { loadList() }, [loadList])

  const handleSelect = async (c: Contrato) => {
    setSelectedId(c.id)
    const full = await contratosApi.get(c.id)
    setForm({
      ctt_n: full.ctt_n, descricao: full.descricao, tipo: full.tipo,
      observacoes: full.observacoes,
      data_assinatura: full.data_assinatura, status: full.status,
      arquivo_path: full.arquivo_path,
    })
    setOriginalCttN(full.ctt_n)
    setEditingCttN(false)
    setCttNError('')
    setClienteId(full.cliente_id)
    setClienteNome(full.cliente_nome)
    const extras = await contratosApi.getClientes(c.id)
    setExtraClientes(extras)
    const advs = await contratosApi.getAdvogados(c.id)
    setAdvogados(advs)
    setAdvogadoInput('')
  }

  const handleNew = async () => {
    setSelectedId(null)
    const { ctt_n } = await contratosApi.nextCttN()
    setForm({ ...EMPTY_FORM, ctt_n })
    setOriginalCttN('')
    setEditingCttN(false)
    setCttNError('')
    setClienteId(null)
    setClienteNome('')
    setExtraClientes([])
    setAdvogados([])
    setAdvogadoInput('')
  }

  const handleCancel = () => {
    setSelectedId(null)
    setForm(EMPTY_FORM)
    setOriginalCttN('')
    setEditingCttN(false)
    setCttNError('')
    setClienteId(null)
    setClienteNome('')
    setExtraClientes([])
    setAdvogados([])
    setAdvogadoInput('')
  }

  const handleDelete = async () => {
    if (!selectedId) return
    if (!confirm(`Remover o contrato ${form.ctt_n}?\n\nHonorários, parcelas e PDF anexado também serão apagados. Essa ação não pode ser desfeita.`)) return
    try {
      await contratosApi.remove(selectedId)
      setSelectedId(null)
      setForm(EMPTY_FORM)
      setOriginalCttN('')
      setEditingCttN(false)
      setCttNError('')
      setClienteId(null)
      setClienteNome('')
      setExtraClientes([])
      setAdvogados([])
      setAdvogadoInput('')
      await loadList()
    } catch (err) {
      alert(`Erro ao remover: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const searchClientes = async (q: string) => {
    setClienteNome(q)
    if (q.length < 2) { setClienteResults([]); setShowDropdown(false); return }
    const results = await clientesApi.list(q)
    setClienteResults(results)
    setShowDropdown(true)
  }

  const pickCliente = (c: Cliente) => {
    setClienteId(c.id)
    setClienteNome(c.nome)
    setShowDropdown(false)
  }

  const searchExtraClientes = async (q: string) => {
    setExtraSearch(q)
    if (q.length < 2) { setExtraResults([]); setShowExtraDropdown(false); return }
    const results = await clientesApi.list(q)
    setExtraResults(results)
    setShowExtraDropdown(true)
  }

  const pickExtraCliente = (c: Cliente) => {
    if (!extraClientes.find(e => e.id === c.id) && c.id !== clienteId) {
      setExtraClientes(prev => [...prev, c])
    }
    setExtraSearch('')
    setExtraResults([])
    setShowExtraDropdown(false)
  }

  const removeExtraCliente = (id: number) => {
    setExtraClientes(prev => prev.filter(c => c.id !== id))
  }

  const addAdvogado = () => {
    const nome = advogadoInput.trim()
    if (!nome || advogados.includes(nome)) return
    setAdvogados(prev => [...prev, nome])
    setAdvogadoInput('')
  }

  const removeAdvogado = (index: number) => {
    setAdvogados(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async (advance = false) => {
    if (!form.ctt_n.trim() || !clienteId) return
    setSaving(true)
    setCttNError('')
    try {
      let contratoId = selectedId

      if (selectedId) {
        try {
          const updated = await contratosApi.update(selectedId, {
            ctt_n: form.ctt_n,
            descricao: form.descricao, tipo: form.tipo,
            advogado: advogados.join(', '),
            observacoes: form.observacoes, data_assinatura: form.data_assinatura,
            status: form.status, arquivo_path: form.arquivo_path,
          })
          if (form.ctt_n !== originalCttN) {
            setOriginalCttN(updated.ctt_n)
            setForm(prev => ({ ...prev, arquivo_path: updated.arquivo_path }))
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          if (msg.includes('409')) {
            setCttNError(`Número "${form.ctt_n}" já está em uso`)
          } else if (msg.includes('500') && form.ctt_n !== originalCttN) {
            setCttNError('Erro ao renomear o arquivo PDF do contrato')
          } else {
            setCttNError('Erro ao salvar o contrato')
          }
          return
        }
      } else {
        const created = await contratosApi.create({
          cliente_id: clienteId,
          ctt_n: form.ctt_n,
          descricao: form.descricao,
          tipo: form.tipo,
          advogado: advogados.join(', '),
          observacoes: form.observacoes,
          data_assinatura: form.data_assinatura,
          status: form.status,
          arquivo_path: form.arquivo_path,
        })
        contratoId = created.id
        setSelectedId(created.id)
        setOriginalCttN(created.ctt_n)
      }
      if (contratoId) {
        await contratosApi.setClientes(contratoId, extraClientes.map(c => c.id))
        await contratosApi.setAdvogados(contratoId, advogados)
      }
      setEditingCttN(false)
      await loadList()
      if (advance && contratoId) {
        setHonorariosContratoId(contratoId)
        setHonorariosOpen(true)
      }
    } finally {
      setSaving(false)
    }
  }

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedId) return
    setPdfError('')
    try {
      const result = await contratosApi.uploadPdf(selectedId, file)
      setForm(prev => ({ ...prev, arquivo_path: result.arquivo_path }))
    } catch {
      setPdfError('Erro ao fazer upload do PDF. Tente novamente.')
    } finally {
      e.target.value = ''
    }
  }

  const handlePdfRemove = async () => {
    if (!selectedId) return
    await contratosApi.removePdf(selectedId)
    setForm(prev => ({ ...prev, arquivo_path: '' }))
  }

  const columns: Column<Contrato>[] = [
    { key: 'ctt_n', header: 'CTT-N', width: '120px' },
    { key: 'cliente_nome', header: 'Cliente' },
    { key: 'status', header: 'Status', width: '100px', render: (r) => <StatusChip status={r.status} /> },
  ]

  const isEmpty = selectedId === null && !form.ctt_n

  return (
    <div>
      <h1 className={styles.pageTitle}>Cadastro de Contratos</h1>
      <div className={styles.page}>
        <div className={styles.listPanel}>
          <div className={styles.listHeader}>
            <SearchInput
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar contrato..."
              style={{ flex: 1 }}
            />
            <Button size="sm" onClick={handleNew}>+ Novo</Button>
          </div>
          <Card flush className={styles.listScroll}>
            <DataTable
              columns={columns}
              data={contratos}
              rowKey={r => r.id}
              selectedKey={selectedId}
              onRowClick={handleSelect}
            />
          </Card>
        </div>

        <Card className={styles.formPanel}>
          {isEmpty ? (
            <div className={styles.emptyState}>
              Selecione um contrato existente ou clique em <strong>Novo Contrato</strong>
            </div>
          ) : (
            <>
          <div className={styles.section}>
            <SectionHeader text="Dados do Contrato" />
            <div className={styles.formGrid}>
              <div>
                <div className={styles.cttRow}>
                  <Input
                    label="CTT-N"
                    value={form.ctt_n}
                    readOnly={!selectedId || !editingCttN}
                    onChange={e => setForm(prev => ({ ...prev, ctt_n: e.target.value }))}
                  />
                  {selectedId && (
                    editingCttN ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setForm(prev => ({ ...prev, ctt_n: originalCttN }))
                          setEditingCttN(false)
                          setCttNError('')
                        }}
                      >
                        Cancelar
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setEditingCttN(true)}>
                        Editar
                      </Button>
                    )
                  )}
                </div>
                {cttNError && (
                  <div style={{ color: 'var(--color-danger, red)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
                    {cttNError}
                  </div>
                )}
              </div>
              <Input
                label="Data de Assinatura"
                type="date"
                value={form.data_assinatura}
                onChange={e => setForm(prev => ({ ...prev, data_assinatura: e.target.value }))}
              />
              <Select
                label="Tipo"
                value={form.tipo}
                onChange={e => setForm(prev => ({ ...prev, tipo: e.target.value }))}
                options={CONTRATO_TIPOS.map(t => ({ value: t, label: t }))}
              />
              <div>
                <div className={styles.statusLabel}>Status</div>
                <div className={styles.statusGroup}>
                  {CONTRATO_STATUS.map(s => (
                    <label key={s} className={styles.statusOption}>
                      <input
                        type="radio" name="status" value={s}
                        checked={form.status === s}
                        onChange={() => setForm(prev => ({ ...prev, status: s }))}
                      />
                      <StatusChip status={s} />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <SectionHeader text="Partes" />
            <div className={styles.clientePickerWrapper}>
              <Input
                label="Cliente Principal"
                value={clienteNome}
                onChange={e => searchClientes(e.target.value)}
                onFocus={() => clienteResults.length > 0 && setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder="Digite para buscar..."
              />
              {showDropdown && clienteResults.length > 0 && (
                <div className={styles.dropdown}>
                  {clienteResults.map(c => (
                    <div key={c.id} className={styles.dropdownItem} onMouseDown={() => pickCliente(c)}>
                      {c.nome} {c.cpf_cnpj && `- ${c.cpf_cnpj}`}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ marginTop: 'var(--space-4)' }} className={styles.clientePickerWrapper}>
              <Input
                label="Adicionar cliente"
                value={extraSearch}
                onChange={e => searchExtraClientes(e.target.value)}
                onFocus={() => extraResults.length > 0 && setShowExtraDropdown(true)}
                onBlur={() => setTimeout(() => setShowExtraDropdown(false), 200)}
                placeholder="Digite para buscar..."
              />
              {showExtraDropdown && extraResults.length > 0 && (
                <div className={styles.dropdown}>
                  {extraResults
                    .filter(c => c.id !== clienteId && !extraClientes.find(e => e.id === c.id))
                    .map(c => (
                      <div key={c.id} className={styles.dropdownItem} onMouseDown={() => pickExtraCliente(c)}>
                        {c.nome} {c.cpf_cnpj && `- ${c.cpf_cnpj}`}
                      </div>
                    ))}
                </div>
              )}
            </div>
            {extraClientes.length > 0 && (
              <div className={styles.chipList}>
                {extraClientes.map(c => (
                  <span key={c.id} className={styles.extraChip}>
                    {c.nome}
                    <span className={styles.extraChipRemove} onClick={() => removeExtraCliente(c.id)}>&times;</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <SectionHeader text="Advogados" />
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <Input
                  value={advogadoInput}
                  onChange={e => setAdvogadoInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { addAdvogado(); e.preventDefault() } }}
                  placeholder="Nome do advogado"
                />
              </div>
              <Button size="sm" variant="secondary" onClick={addAdvogado} disabled={!advogadoInput.trim()}>
                Adicionar
              </Button>
            </div>
            {advogados.length > 0 && (
              <div className={styles.chipList}>
                {advogados.map((nome, i) => (
                  <span key={i} className={styles.extraChip}>
                    {nome}
                    <span className={styles.extraChipRemove} onClick={() => removeAdvogado(i)}>&times;</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <SectionHeader text="Objeto e Observações" />
            <TextArea
              label="Descrição"
              value={form.descricao}
              onChange={e => setForm(prev => ({ ...prev, descricao: e.target.value }))}
              rows={3}
            />
            <TextArea
              label="Observações"
              value={form.observacoes}
              onChange={e => setForm(prev => ({ ...prev, observacoes: e.target.value }))}
              rows={3}
              wrapperClassName={styles.fullWidth}
              style={{ marginTop: 'var(--space-4)' }}
            />
          </div>

          <div className={styles.section}>
            <SectionHeader text="Documento do Contrato" />
            <div className={styles.pdfRow}>
              {form.arquivo_path ? (
                <>
                  <span className={styles.pdfName}>{form.arquivo_path}</span>
                  {selectedId && (
                    <a
                      href={`/api/contratos/${selectedId}/pdf`}
                      download={form.arquivo_path}
                      className={styles.pdfDownloadLink}
                    >
                      Baixar PDF
                    </a>
                  )}
                  <Button size="sm" variant="ghost" onClick={handlePdfRemove}>Remover</Button>
                </>
              ) : (
                <>
                  <input type="file" accept=".pdf" ref={fileInputRef} style={{ display: 'none' }} onChange={handlePdfUpload} />
                  <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={!selectedId}>
                    Anexar PDF
                  </Button>
                  {!selectedId && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-on-surface-muted)' }}>Salve o contrato primeiro</span>}
                </>
              )}
            </div>
            {pdfError && <div style={{ color: 'var(--color-danger, red)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>{pdfError}</div>}
          </div>

          <div className={styles.actions}>
            <Button variant="secondary" onClick={handleCancel}>Cancelar</Button>
            {selectedId && (
              <Button variant="danger" onClick={handleDelete} disabled={saving}>
                Remover
              </Button>
            )}
            <Button variant="secondary" onClick={() => handleSave(false)} disabled={saving || !clienteId}>
              Salvar
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saving || !clienteId}>
              {saving ? 'Salvando...' : 'Salvar e Avançar'}
            </Button>
          </div>
            </>
          )}
        </Card>
      </div>

      <HonorariosDialog
        open={honorariosOpen}
        contratoId={honorariosContratoId}
        onClose={() => setHonorariosOpen(false)}
      />
    </div>
  )
}
