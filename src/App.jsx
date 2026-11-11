import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

export default function App() {
  // ---------------------------------------------------------------
  // AUTH0: tudo vem do hook useAuth0 (o Provider está no main.jsx)
  //  - isLoading: true enquanto o Auth0 verifica se já existe sessão
  //  - isAuthenticated: true se o usuário está logado
  //  - user: dados do usuário (email, nome, claim de roles...)
  //  - error: erro do login, se houver
  //  - loginWithRedirect: manda para a página de login do Auth0
  //  - logout: encerra a sessão
  //  - getAccessTokenSilently: devolve o token JWT que o back valida
  // ---------------------------------------------------------------
  const { isLoading, isAuthenticated, user, error,
          loginWithRedirect, logout, getAccessTokenSilently } = useAuth0()

  // ---------------------------------------------------------------
  // ESTADOS (dados que, ao mudar, redesenham a tela)
  //  - itens: a lista que veio do back (GET)
  //  - erro: mensagem de erro mostrada em vermelho
  //  - form: valores digitados no formulário de cadastro
  // MUDAR: renomeie "itens" e os campos do form (nome, nota) para os
  //        campos reais da sua entidade. Os nomes dos campos precisam
  //        ser IGUAIS aos atributos da entidade Java.
  // ---------------------------------------------------------------
  const [itens, setItens] = useState([])
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({ titulo: '', descricao: '', prioridade: '', emailCriador: ''})

  // ---------------------------------------------------------------
  // api(): única função que fala com o back
  //  - pega o token do Auth0 e manda no header Authorization
  //  - todo caminho recebe o prefixo /api, que é o proxy
  //    (Vite em dev, vercel.json em produção). O proxy REMOVE o /api
  //    antes de chegar no Spring, então no back a rota NÃO leva /api.
  //  - lança erro se o status não for 2xx (401 = sem token válido,
  //    403 = sem a role, 404 = rota errada)
  //  - se a resposta vier vazia (ex.: DELETE), devolve null
  // MUDAR: normalmente nada. Só se o back deixar de usar JSON.
  // ---------------------------------------------------------------
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

  // ---------------------------------------------------------------
  // GET (findAll): busca a lista e guarda no estado
  // MUDAR: a rota '/itens' para a do seu @RequestMapping no back
  //        (ex.: '/produtos').
  // ---------------------------------------------------------------
  async function carregar() {
    try { setErro(''); setItens(await api('/tarefas')) }
    catch (e) { setErro(e.message) }
  }

  // Carrega a lista assim que o usuário fica logado
  useEffect(() => { if (isAuthenticated) carregar() }, [isAuthenticated])

  // ---------------------------------------------------------------
  // POST (cadastro): envia o formulário, limpa os campos e recarrega
  // MUDAR: a rota '/itens' e o objeto dentro do JSON.stringify,
  //        com os campos da sua entidade. Number() converte o texto
  //        do input em número, use só em campos numéricos.
  // ---------------------------------------------------------------
  async function cadastrar(e) {
    e.preventDefault()   // impede o formulário de recarregar a página
    try {
      setErro('')
      await api('/tarefas', { method: 'POST', body: JSON.stringify({titulo: form.titulo, descricao: form.descricao,
      prioridade: form.prioridade, emailCriador: form.emailCriador })})
      setForm({titulo: '', descricao: '', prioridade: '', emailCriador: ''})   // limpa o formulário
      carregar()                       // atualiza a lista
    } catch (e) { setErro(e.message) }
  }

  // ---------------------------------------------------------------
  // DELETE: confirma e apaga pelo id
  // MUDAR: só a rota '/itens/' (mantenha o ${id} no final).
  // ---------------------------------------------------------------
  async function apagar(id) {
    if (!window.confirm('Apagar?')) return
    try { await api(`/tarefas/${id}`, { method: 'DELETE' }); carregar() }
    catch (e) { setErro(e.message) }
  }

  // ---------------------------------------------------------------
  // TELA 1: enquanto o Auth0 checa a sessão
  // ---------------------------------------------------------------
  if (isLoading) return <p>Carregando...</p>

  // ---------------------------------------------------------------
  // TELA 2: usuário NÃO logado (título + botão de entrar)
  // MUDAR: o texto do título e o do botão.
  // ---------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div style={{ padding: 24 }}>
        <h1>PF</h1>
        <button onClick={() => loginWithRedirect()}>Entrar</button>
        {error && <p style={{ color: 'red' }}>{error.message}</p>}
      </div>
    )
  }

  // ---------------------------------------------------------------
  // TELA 3: usuário logado
  //  - topo: e-mail do usuário e botão de sair
  //  - formulário: cadastro (POST)
  //  - lista: itens com botões de editar e apagar
  // MUDAR: os inputs do formulário (um por campo da entidade) e o
  //        que aparece em cada <li> ({i.nome}, {i.nota}...).
  //        O key={i.id} precisa continuar sendo o id da entidade.
  //
  // DICA (roles): para mostrar o formulário só para ADMIN, leia a
  // role do token com user['https://pf-api/roles'] e envolva o
  // <form> em {isAdmin && (...)}. O back continua sendo quem
  // realmente bloqueia, o front só esconde o botão.
  // ---------------------------------------------------------------
  return (
    <div style={{ padding: 24, maxWidth: 600 }}>
      <p>
        {user.email}{' '}
        <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>Sair</button>
      </p>
      {erro && <p style={{ color: 'red' }}>{erro}</p>}

      <form onSubmit={cadastrar} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input placeholder="Título" value={form.titulo} required
               onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
        <input placeholder="Descrição" value={form.descricao} required
               onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        <input placeholder="Prioridade" value={form.prioridade} required
               onChange={(e) => setForm({ ...form, prioridade: e.target.value })} />
        <input placeholder="E-mail Criador" value={form.emailCriador} required
               onChange={(e) => setForm({ ...form, emailCriador: e.target.value })} />
        <button type="submit">Cadastrar</button>
      </form>

      <ul>
        {itens.map((i) => (
          <li key={i.id}>
            {i.titulo} | {i.descricao}{' '} | {i.prioridade} | {i.emailCriador}
            <button onClick={() => apagar(i.id)}>Apagar</button>
          </li>
        ))}
      </ul>
    </div>
  )
}