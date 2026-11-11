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
  const [form, setForm] = useState({ nome: '', nota: 5 })

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
    try { setErro(''); setItens(await api('/health')) }
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
      await api('/itens', { method: 'POST', body: JSON.stringify({ nome: form.nome, nota: Number(form.nota) }) })
      setForm({ nome: '', nota: 5 })   // limpa o formulário
      carregar()                       // atualiza a lista
    } catch (e) { setErro(e.message) }
  }

  // ---------------------------------------------------------------
  // PUT (edição no macete): pergunta os novos valores com prompt()
  // e manda para /itens/{id}. Cancelar o prompt devolve null e sai.
  // MUDAR: a rota (mantenha o /${item.id} no final), os textos dos
  //        prompts e os campos do JSON. Mais tarde dá para trocar o
  //        prompt por um formulário de edição na própria tela.
  // ---------------------------------------------------------------
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

  // ---------------------------------------------------------------
  // DELETE: confirma e apaga pelo id
  // MUDAR: só a rota '/itens/' (mantenha o ${id} no final).
  // ---------------------------------------------------------------
  async function apagar(id) {
    if (!window.confirm('Apagar?')) return
    try { await api(`/itens/${id}`, { method: 'DELETE' }); carregar() }
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