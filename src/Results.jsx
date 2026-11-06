import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import './Results.css'

function Results() {
  const [poll, setPoll] = useState(null)
  const [results, setResults] = useState([])
  const [displayResults, setDisplayResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resultsRevealed, setResultsRevealed] = useState(false)
  const animatedPollId = useRef(null)
  const revealTimerRef = useRef(null)

  useEffect(() => {
    let active = true

    async function loadResults() {
      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .select('id, title, question, is_active, voting_open')
        .eq('is_active', true)
        .maybeSingle()

      if (pollError) {
        if (active) {
          setError(pollError.message)
          setLoading(false)
        }
        return
      }

      if (!pollData) {
        if (active) {
          setPoll(null)
          setResults([])
          setDisplayResults([])
          setLoading(false)
        }
        return
      }

      const { data: resultData, error: resultError } =
        await supabase.rpc('get_poll_results', {
          p_poll_id: pollData.id,
        })

      if (!active) return

      if (resultError) {
        setError(resultError.message)
        setLoading(false)
        return
      }

      setPoll(pollData)
      setResults(resultData || [])
      setError('')
      setLoading(false)
    }

    loadResults()
    const timer = setInterval(loadResults, 5000)

    return () => {
      active = false
      clearInterval(timer)
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current)
        revealTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!poll || !results.length) {
      setDisplayResults([])
      setResultsRevealed(false)
      return
    }

    if (poll.voting_open) {
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current)
        revealTimerRef.current = null
      }
      setResultsRevealed(true)
      setDisplayResults(results)
      return
    }

    if (animatedPollId.current !== poll.id) {
      animatedPollId.current = poll.id
      setResultsRevealed(false)
      setDisplayResults([])

      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current)
      }

      revealTimerRef.current = setTimeout(() => {
        setResultsRevealed(true)
        revealTimerRef.current = null
      }, 15000)

      return () => {
        if (revealTimerRef.current) {
          clearTimeout(revealTimerRef.current)
          revealTimerRef.current = null
        }
      }
    }

    if (!resultsRevealed) {
      setDisplayResults([])
      return
    }

    if (!poll.voting_open && resultsRevealed) {
      const start = performance.now()
      const duration = 5000
      let frameId

      function animate(now) {
        const progress = Math.min((now - start) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)

        setDisplayResults(
          results.map(item => ({
            ...item,
            vote_count: Math.round(Number(item.vote_count) * eased),
          }))
        )

        if (progress < 1) {
          frameId = requestAnimationFrame(animate)
        }
      }

      frameId = requestAnimationFrame(animate)

      return () => cancelAnimationFrame(frameId)
    }

    setDisplayResults(results)
  }, [poll, results])

  const totalVotes = displayResults.reduce(
    (sum, item) => sum + Number(item.vote_count),
    0
  )

  return (
    <main className="results-page">
      <div className="results-container">
        <header className="results-header">
          <div className="results-emblem">L</div>
          <p className="results-eyebrow">МАТЛАГ 2026 · СОВЕТ СЫЩИКОВ</p>
          <h1>ДЕЛО № 1899</h1>
          <p className="results-subtitle">РЕЗУЛЬТАТЫ РАССЛЕДОВАНИЯ</p>
          <div className="results-line">✦</div>
        </header>

        {loading && <p className="results-message">Загружаем результаты...</p>}

        {error && (
          <p className="results-message results-error">
            Ошибка: {error}
          </p>
        )}

        {!loading && !error && !poll && (
          <p className="results-message">Нет активного голосования</p>
        )}

        {poll && (
          <section className="results-card">
            <div className="results-top">
              <span>{poll.title}</span>
              <span className="live-indicator">
                <i /> LIVE
              </span>
            </div>

            <h2>{poll.question}</h2>

            {!resultsRevealed && !poll.voting_open ? (
              <div className="results-loading">
                <div className="results-loading-spinner" />
                <p>ЗАГРУЗКА РЕЗУЛЬТАТОВ...</p>
                <span>Пожалуйста, подождите</span>
              </div>
            ) : (
            <div className="result-list">
              {displayResults.map((item, index) => {
                const votes = Number(item.vote_count)
                const percent = totalVotes
                  ? Math.round((votes / totalVotes) * 100)
                  : 0

                return (
                  <div className="result-item" key={item.option_id}>
                    <div className="result-label-row">
                      <div className="result-name">
                        <span>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        {item.option_text}
                      </div>

                      <div className="result-numbers">
                        <strong>{percent}%</strong>
                      </div>
                    </div>

                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            )}

            <div className="results-bottom">
              {poll.voting_open
                ? 'ГОЛОСОВАНИЕ ПРОДОЛЖАЕТСЯ'
                : 'ГОЛОСОВАНИЕ ЗАКРЫТО'}
            </div>
          </section>
        )}

        <footer className="results-footer">
          ЛЕВИАФАН · ТАЙНЫ ОКЕАНА · МАТЛАГ 2026
        </footer>
      </div>
    </main>
  )
}

export default Results
