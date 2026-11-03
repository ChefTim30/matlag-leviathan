
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './App.css'

function getVoterId() {
  let id = localStorage.getItem('leviathan_voter_id')

  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('leviathan_voter_id', id)
  }

  return id
}

function App() {
  const [poll, setPoll] = useState(null)
  const [options, setOptions] = useState([])
  const [selectedOption, setSelectedOption] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadPoll() {
      setLoading(true)
      setError('')

      const { data, error: pollError } = await supabase
        .from('polls')
        .select('id, title, question, is_active, voting_open')
        .eq('is_active', true)
        .maybeSingle()

      if (pollError) {
        setError(pollError.message)
        setLoading(false)
        return
      }

      if (!data) {
        setPoll(null)
        setLoading(false)
        return
      }

      setPoll(data)

      const { data: optionData, error: optionError } = await supabase
        .from('poll_options')
        .select('id, label, sort_order')
        .eq('poll_id', data.id)
        .order('sort_order')

      if (optionError) {
        setError(optionError.message)
        setLoading(false)
        return
      }

      setOptions(optionData || [])

      const voterId = getVoterId()
      const alreadyVoted = localStorage.getItem(
        `leviathan_voted_${data.id}_${voterId}`
      )

      setHasVoted(Boolean(alreadyVoted))
      setSelectedOption(null)
      setMessage('')
      setLoading(false)
    }

    loadPoll()
  }, [])

  async function submitVote() {
    if (!poll || !selectedOption || !poll.voting_open || hasVoted) {
      return
    }

    setSending(true)
    setMessage('')
    setError('')

    try {
      const voterId = getVoterId()

      const { error: voteError } = await supabase.rpc('cast_vote', {
        p_poll_id: poll.id,
        p_option_id: selectedOption,
        p_voter_id: voterId,
      })

      if (voteError) {
        if (voteError.message.toLowerCase().includes('duplicate')) {
          setHasVoted(true)
          setMessage('Вы уже голосовали в этом раунде.')
        } else {
          setError(voteError.message)
        }
        return
      }

      localStorage.setItem(
        `leviathan_voted_${poll.id}_${voterId}`,
        'true'
      )

      setHasVoted(true)
      setMessage('Ваш голос принят. Решение сыщиков зафиксировано.')
    } catch {
      setError('Не удалось отправить голос. Проверьте соединение.')
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="page">
      <div className="background-glow" />

      <div className="container">
        <header className="header">
          <div className="brand-mark">L</div>
          <p className="eyebrow">
            МАТЛАГ 2026 <span>·</span> ИНТЕРАКТИВНОЕ РАССЛЕДОВАНИЕ
          </p>

          <h1>ДЕЛО № 1899</h1>
          <p className="subtitle">СОВЕТ СЫЩИКОВ</p>

          <div className="ornament">
            <span />
            <div>✦</div>
            <span />
          </div>
        </header>

        <section className="content">
          {loading && (
            <div className="info-card">
              <div className="loader" />
              <p>Загружаем материалы расследования...</p>
            </div>
          )}

          {error && (
            <div className="notice error-notice">
              <strong>Ошибка</strong>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && !poll && (
            <div className="info-card">
              <p className="round-label">АРХИВ РАССЛЕДОВАНИЙ</p>
              <h2>Пока нет активного дела</h2>
              <p>Ожидайте сигнала от ведущего.</p>
            </div>
          )}

          {poll && (
            <div className="poll-card">
              <div className="poll-top">
                <span className="round-label">{poll.title}</span>
                <span className={`status ${poll.voting_open ? 'open' : ''}`}>
                  <span className="status-dot" />
                  {poll.voting_open ? 'ГОЛОСОВАНИЕ ОТКРЫТО' : 'ОЖИДАНИЕ'}
                </span>
              </div>

              <div className="question-block">
                <p className="question-caption">ВАШЕ РЕШЕНИЕ ВЛИЯЕТ НА ХОД ДЕЛА</p>
                <h2>{poll.question}</h2>
                <p className="question-hint">
                  Выберите один вариант ответа
                </p>
              </div>

              <div className="options">
                {options.map((option, index) => {
                  const isSelected = selectedOption === option.id

                  return (
                    <button
                      className={`option ${isSelected ? 'selected' : ''}`}
                      key={option.id}
                      onClick={() => {
                        if (poll.voting_open && !hasVoted && !sending) {
                          setSelectedOption(option.id)
                          setMessage('')
                        }
                      }}
                      disabled={!poll.voting_open || hasVoted || sending}
                    >
                      <span className="option-number">
                        {String(index + 1).padStart(2, '0')}
                      </span>

                      <span className="option-label">{option.label}</span>

                      <span className="option-check">
                        {isSelected ? '✓' : ''}
                      </span>
                    </button>
                  )
                })}
              </div>

              {poll.voting_open && !hasVoted && (
                <button
                  className="submit-button"
                  onClick={submitVote}
                  disabled={!selectedOption || sending}
                >
                  {sending ? 'ОТПРАВЛЯЕМ РЕШЕНИЕ...' : 'ПОДТВЕРДИТЬ РЕШЕНИЕ'}
                  <span>→</span>
                </button>
              )}

              {hasVoted && (
                <div className="notice success-notice">
                  <strong>✓ Голос зафиксирован</strong>
                  <p>Ваше решение принято. Благодарим за участие.</p>
                </div>
              )}

              {message && !hasVoted && (
                <div className="notice success-notice">
                  <p>{message}</p>
                </div>
              )}

              {error && (
                <div className="notice error-notice">
                  <p>{error}</p>
                </div>
              )}

              {!poll.voting_open && !hasVoted && (
                <p className="waiting-text">
                  Ведущий скоро откроет голосование
                </p>
              )}
            </div>
          )}
        </section>

        <footer className="footer">
          <p>ЛЕВИАФАН · ТАЙНЫ ОКЕАНА</p>
          <span>МАТЛАГ 2026</span>
        </footer>
      </div>
    </main>
  )
}

export default App
