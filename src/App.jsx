import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

export default function App() {
  const { isLoading, isAuthenticated, user, error,
          loginWithRedirect, logout, getAccessTokenSilently } = useAuth0()

  const [itens, setItens] = useState([])
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({ nome: '', nota: 5 })

  // chamada única para o back, sempre com o token
  async function api(caminho, opcoes = {}) {
    const token = await getAccessTokenSilently()
    const res = await fetch(`/api${caminho}`, {
      ...opcoes,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`Erro ${res.status}`)
    const texto = await res.text()
    return texto ? JSON.parse(texto) : null
  }

  async function carregar() {
    try { setErro(''); setItens(await api('/itens')) }
    catch (e) { setErro(e.message) }
  }

  useEffect(() => { if (isAuthenticated) carregar() }, [isAuthenticated])

  async function cadastrar(e) {
    e.preventDefault()
    try {
      setErro('')
      await api('/itens', { method: 'POST', body: JSON.stringify({ nome: form.nome, nota: Number(form.nota) }) })
      setForm({ nome: '', nota: 5 })
      carregar()
    } catch (e) { setErro(e.message) }
  }

  // edit no macete: usa prompt do navegador
  async function editar(item) {
    const nome = window.prompt('Novo nome', item.nome)
    if (nome === null) return
    const nota = window.prompt('Nova nota', item.nota)
    if (nota === null) return
    try {
      await api(`/itens/${item.id}`, { method: 'PUT', body: JSON.stringify({ nome, nota: Number(nota) }) })
      carregar()
    } catch (e) { setErro(e.message) }
  }

  async function apagar(id) {
    if (!window.confirm('Apagar?')) return
    try { await api(`/itens/${id}`, { method: 'DELETE' }); carregar() }
    catch (e) { setErro(e.message) }
  }

  if (isLoading) return <p>Carregando...</p>

  if (!isAuthenticated) {
    return (
      <div style={{ padding: 24 }}>
        <button onClick={() => loginWithRedirect()}>Entrar</button>
        {error && <p style={{ color: 'red' }}>{error.message}</p>}
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 600 }}>
      <p>
        {user.email}{' '}
        <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>Sair</button>
      </p>
      {erro && <p style={{ color: 'red' }}>{erro}</p>}

      <form onSubmit={cadastrar} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input placeholder="Nome" value={form.nome} required
               onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        <input type="number" min="0" max="10" value={form.nota}
               onChange={(e) => setForm({ ...form, nota: e.target.value })} />
        <button type="submit">Cadastrar</button>
      </form>

      <ul>
        {itens.map((i) => (
          <li key={i.id}>
            {i.nome} | nota {i.nota}{' '}
            <button onClick={() => editar(i)}>Editar</button>{' '}
            <button onClick={() => apagar(i.id)}>Apagar</button>
          </li>
        ))}
      </ul>
    </div>
  )
}