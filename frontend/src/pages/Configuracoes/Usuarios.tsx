import { useCallback, useEffect, useMemo, useState } from 'react'
import { Avatar, Button, Input, Modal, Select, StatusChip } from '../../design-system/components'
import { api } from '../../api/client'
import { USUARIO_PERFIS, USUARIO_STATUS, type PerfilInfo, type Usuario } from '../../types'
import styles from './Configuracoes.module.css'

const VAZIO = {
  nome: '', email: '', perfil: 'Paralegal', escopo: '', status: 'Convite pendente',
}

type Formulario = typeof VAZIO

export function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [perfis, setPerfis] = useState<PerfilInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [criando, setCriando] = useState(false)
  const [form, setForm] = useState<Formulario>(VAZIO)
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get<Usuario[]>('/usuarios'),
      api.get<PerfilInfo[]>('/usuarios/perfis'),
    ])
      .then(([us, ps]) => { setUsuarios(us); setPerfis(ps); setErro(null) })
      .catch(() => setErro('Não foi possível carregar os usuários.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const resumo = useMemo(() => {
    const ativos = usuarios.filter(u => u.status === 'Ativo').length
    const convites = usuarios.filter(u => u.status === 'Convite pendente').length
    const partes = [
      `${ativos} ${ativos === 1 ? 'ativo' : 'ativos'}`,
      convites > 0 ? `${convites} ${convites === 1 ? 'convite pendente' : 'convites pendentes'}` : null,
      'perfis definem o que cada um vê e edita',
    ].filter(Boolean)
    return partes.join(' · ')
  }, [usuarios])

  const abrirNovo = () => { setForm(VAZIO); setEditando(null); setCriando(true) }
  const abrirEdicao = (u: Usuario) => {
    setForm({ nome: u.nome, email: u.email, perfil: u.perfil, escopo: u.escopo, status: u.status })
    setEditando(u)
    setCriando(true)
  }

  const salvar = async () => {
    if (!form.nome.trim()) return
    setSalvando(true)
    setErro(null)
    try {
      if (editando) await api.put(`/usuarios/${editando.id}`, form)
      else await api.post('/usuarios', form)
      setCriando(false)
      carregar()
    } catch {
      setErro('Não foi possível salvar o usuário.')
    } finally {
      setSalvando(false)
    }
  }

  const remover = async () => {
    if (!editando) return
    setSalvando(true)
    try {
      await api.del(`/usuarios/${editando.id}`)
      setCriando(false)
      carregar()
    } catch {
      setErro('Não foi possível remover o usuário.')
    } finally {
      setSalvando(false)
    }
  }

  const set = (campo: keyof Formulario) =>
    (e: { target: { value: string } }) => setForm(f => ({ ...f, [campo]: e.target.value }))

  return (
    <div className={styles.usuarios}>
      {erro && <div className={styles.erro}>{erro}</div>}

      <div className={styles.usuariosTopo}>
        <div>
          <h2 className={styles.usuariosTitulo}>Usuários do sistema</h2>
          <p className={styles.usuariosResumo}>
            {loading ? 'Carregando…' : resumo}
          </p>
        </div>
        <Button onClick={abrirNovo}>Convidar usuário</Button>
      </div>

      <section className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Perfil</th>
                <th>Escopo</th>
                <th>Último acesso</th>
                <th>Status</th>
                <th className={styles.right}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className={styles.empty}>Carregando usuários…</td></tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.empty}>
                    Nenhum usuário cadastrado. Convide o primeiro para começar.
                  </td>
                </tr>
              ) : usuarios.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className={styles.usuarioCelula}>
                      <Avatar name={u.nome} size="sm" />
                      <span>
                        <span className={styles.usuarioNome}>{u.nome}</span>
                        <span className={styles.usuarioEmail}>{u.email || '—'}</span>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={u.perfil === 'Sócio' ? styles.perfilSocio : styles.perfil}>
                      {u.perfil}
                    </span>
                  </td>
                  <td className={styles.escopo}>{u.escopo || '—'}</td>
                  {/* Sem login, ninguém "acessa" — a coluna fica vazia. */}
                  <td className={styles.mono}>{u.ultimo_acesso || '—'}</td>
                  <td><StatusChip status={u.status} /></td>
                  <td className={styles.right}>
                    <button
                      type="button"
                      className={styles.acaoLink}
                      onClick={() => abrirEdicao(u)}
                    >
                      Editar permissões
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.perfisCard}>
        <h3 className={styles.perfisTitulo}>O que cada perfil pode fazer</h3>
        <p className={styles.perfisNota}>
          Perfis são fixos; o escopo por advogado ou área é ajustável por usuário.
        </p>
        <div className={styles.perfisGrid}>
          {perfis.map(p => (
            <div key={p.nome} className={styles.perfilCard}>
              <div className={styles.perfilNome}>{p.nome}</div>
              <div className={styles.perfilDesc}>{p.descricao}</div>
            </div>
          ))}
        </div>
      </section>

      <Modal
        open={criando}
        onClose={() => setCriando(false)}
        title={editando ? 'Editar permissões' : 'Convidar usuário'}
        footer={
          <>
            {editando && (
              <Button variant="danger" onClick={remover} disabled={salvando}>
                Remover
              </Button>
            )}
            <Button variant="secondary" onClick={() => setCriando(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando || !form.nome.trim()}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <Input label="Nome" value={form.nome} onChange={set('nome')}
            wrapperClassName={styles.span2} />
          <Input label="E-mail" type="email" value={form.email} onChange={set('email')}
            wrapperClassName={styles.span2} />
          <Select label="Perfil" value={form.perfil} onChange={set('perfil')}
            options={USUARIO_PERFIS.map(p => ({ value: p, label: p }))} />
          <Select label="Status" value={form.status} onChange={set('status')}
            options={USUARIO_STATUS.map(s => ({ value: s, label: s }))} />
          <Input label="Escopo" value={form.escopo} onChange={set('escopo')}
            placeholder="Ex.: Cível e trabalhista" wrapperClassName={styles.span2} />
        </div>
      </Modal>
    </div>
  )
}
