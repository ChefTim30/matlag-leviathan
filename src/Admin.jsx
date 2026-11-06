
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './Admin.css'

function Admin() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [polls, setPolls] = useState([])
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) loadDashboard()
  }, [session])

  async function login(event) {
    event.preventDefault()
    setBusy(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) setError(error.message)
    setBusy(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    setPolls([])
    setVotes([])
  }

  async function loadDashboard() {
    setLoading(true)
    setError('')

    const { data: admin, error: adminError } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (adminError || !admin) {
      setError('У этого аккаунта нет прав администратора.')
      setLoading(false)
      return
    }

    const { data, error: pollError } = await supabase
      .from('polls')
      .select('id, title, question, is_active, voting_open, created_at')
      .order('created_at')

    if (pollError) {
      setError(pollError.message)
      setLoading(false)
      return
    }

    setPolls(data || [])

    const active = (data || []).find(p => p.is_active)

    if (active) {
      const { data: resultData, error: resultError } =
        await supabase.rpc('get_poll_results', {
          p_poll_id: active.id,
        })

      if (resultError) {
        setError(resultError.message)
      } else {
        setVotes(resultData || [])
      }
    } else {
      setVotes([])
    }

    setLoading(false)
  }

  async function runAction(action, args = {}) {
    setBusy(true)
    setMessage('')
    setError('')

    const { error } = await supabase.rpc(action, args)

    if (error) {
      setError(error.message)
    } else {
      setMessage('Команда успешно выполнена.')
      await loadDashboard()
    }

    setBusy(false)
  }

  const totalVotes = votes.reduce(
    (sum, item) => sum + Number(item.vote_count),
    0
  )

  if (loading && !session) {
    return <main className="admin-page">Загрузка...</main>
  }

  if (!session) {
    return (
      <main className="admin-page">
        <div className="admin-login">
          <div className="admin-emblem">L</div>
          <p className="admin-eyebrow">МАТЛАГ 2026 · СЛУЖЕБНЫЙ ДОСТУП</p>
          <h1>ПАНЕЛЬ ВЕДУЩЕГО</h1>
          <p className="admin-subtitle">ДЕЛО № 1899</p>

          <form onSubmit={login}>
            <label>Электронная почта</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
            />

            <label>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Ваш пароль"
              required
            />

            <button disabled={busy}>
              {busy ? 'ВХОД...' : 'ВОЙТИ В СИСТЕМУ'}
            </button>
          </form>

          {error && <p className="admin-error">{error}</p>}
        </div>
      </main>
    )
  }

  return (
    <main className="admin-page">
      <div className="admin-container">
        <header className="admin-header">
          <div>
            <p className="admin-eyebrow">МАТЛАГ 2026 · CONTROL ROOM</p>
            <h1>ПАНЕЛЬ ВЕДУЩЕГО</h1>
            <p className="admin-subtitle">ДЕЛО № 1899 · СОВЕТ СЫЩИКОВ</p>
          </div>
          <button className="logout-button" onClick={logout}>
            ВЫЙТИ
          </button>
        </header>

        {error && <div className="admin-alert">{error}</div>}
        {message && <div className="admin-success">{message}</div>}

        <section className="admin-overview">
          <div>
            <span>ВСЕГО РАУНДОВ</span>
            <strong>{polls.length}</strong>
          </div>
          <div>
            <span>ГОЛОСОВ В АКТИВНОМ РАУНДЕ</span>
            <strong>{totalVotes}</strong>
          </div>
        </section>

        <section className="admin-section">
          <div className="section-heading">
            <h2>УПРАВЛЕНИЕ РАУНДАМИ</h2>
            <button
              className="refresh-button"
              onClick={loadDashboard}
              disabled={busy}
            >
              ↻ ОБНОВИТЬ
            </button>
          </div>

          <div className="admin-polls">
            {polls.map((poll, index) => (
              <article className="admin-poll" key={poll.id}>
                <div className="admin-poll-heading">
                  <span className="admin-round">
                    РАУНД {index + 1}
                  </span>
                  {poll.is_active && (
                    <span className="active-label">АКТИВЕН</span>
                  )}
                </div>

                <h3>{poll.question}</h3>

                <p className="poll-state">
                  {poll.voting_open
                    ? '● Голосование открыто'
                    : '○ Голосование закрыто'}
                </p>

                <button
                  className="secondary-button"
                  disabled={busy || poll.is_active}
                  onClick={() =>
                    runAction('admin_set_active_poll', {
                      p_poll_id: poll.id,
                    })
                  }
                >
                  СДЕЛАТЬ АКТИВНЫМ
                </button>

                {poll.is_active && (
                  <div className="active-controls">
                    <button
                      className="primary-button"
                      disabled={busy || poll.voting_open}
                      onClick={() =>
                        runAction('admin_set_voting', {
                          p_open: true,
                        })
                      }
                    >
                      ОТКРЫТЬ ГОЛОСОВАНИЕ
                    </button>

                    <button
                      className="secondary-button"
                      disabled={busy || !poll.voting_open}
                      onClick={() =>
                        runAction('admin_set_voting', {
                          p_open: false,
                        })
                      }
                    >
                      ЗАКРЫТЬ ГОЛОСОВАНИЕ
                    </button>

                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="admin-section">
          <h2>РЕЗУЛЬТАТЫ АКТИВНОГО РАУНДА</h2>

          {votes.map(item => (
            <div className="admin-result" key={item.option_id}>
              <span>{item.option_text}</span>
              <strong>{item.vote_count}</strong>
            </div>
          ))}
        </section>

        <footer className="admin-footer">
          СИСТЕМА УПРАВЛЕНИЯ · ЛЕВИАФАН · МАТЛАГ 2026
        </footer>
      </div>
    </main>
  )
}

export default Admin
