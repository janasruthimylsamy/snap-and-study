import { useState, useEffect } from 'react'
import {
  saveStudySession,
  getStudySessions,
  deleteStudySession,
  clearStudyHistory,
} from './studyStorage'
import './App.css'

const sectionIcons = {
  'SIMPLE EXPLANATION': '🧠',
  'SHORT SUMMARY': '📝',
  'KEY POINTS': '🔑',
  'PRACTICE QUESTIONS': '❓',
}

const sectionIds = {
  'SIMPLE EXPLANATION': 'ai-explanation',
  'SHORT SUMMARY': 'smart-summary',
  'KEY POINTS': 'key-points',
  'PRACTICE QUESTIONS': 'practice-learn',
}

function formatInlineText(text) {
  return text.split(/(\*\*.*?\*\*|\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }

    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>
    }

    return part
  })
}

function isSectionHeading(line) {
  const clean = line
    .replace(/^#{1,4}\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/:$/, '')
    .trim()
    .toUpperCase()

  return Object.keys(sectionIcons).find((heading) =>
    clean.includes(heading)
  )
}

function renderFormattedResult(text) {
  const lines = text.split('\n')
  const sections = []
  let currentSection = null
  let paragraph = []

  const flushParagraph = () => {
    if (paragraph.length && currentSection) {
      currentSection.blocks.push({
        type: 'paragraph',
        text: paragraph.join(' '),
      })
    }

    paragraph = []
  }

  const flushSection = () => {
    flushParagraph()

    if (currentSection) {
      sections.push(currentSection)
    }
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trim()

    if (!line || /^[-*_]{3,}$/.test(line)) {
      flushParagraph()
      return
    }

    const heading = isSectionHeading(line)

    if (heading) {
      flushSection()
      currentSection = { title: heading, blocks: [] }
      return
    }

    if (!currentSection) {
      currentSection = {
        title: 'AI STUDY NOTES',
        blocks: [],
      }
    }

    const cleanLine = line.replace(/^#{1,4}\s*/, '')
    const bulletMatch = cleanLine.match(/^(?:[-*•]|\d+[.)])\s+(.+)$/)

    if (bulletMatch) {
      flushParagraph()

      currentSection.blocks.push({
        type: /^\d+[.)]/.test(cleanLine) ? 'numbered' : 'bullet',
        text: bulletMatch[1],
      })

      return
    }

    paragraph.push(cleanLine)
  })

  flushSection()

  return (
    <div className="formatted-result">
      {sections.map((section, index) => (
        <article
          className="result-section"
          id={sectionIds[section.title]}
          key={`${section.title}-${index}`}
        >
          <h3 className="result-section-title">
            <span className="result-section-icon">
              {sectionIcons[section.title] || '✨'}
            </span>
            {section.title.replace(/\b\w/g, (char) => char.toUpperCase())}
          </h3>

          {section.blocks.map((block, blockIndex) => {
            if (block.type === 'bullet' || block.type === 'numbered') {
              const numberMatch = block.text.match(/^(\d+)[.)]\s*/)
              const itemText =
                block.type === 'numbered'
                  ? block.text.replace(/^\d+[.)]\s*/, '')
                  : block.text

              return (
                <div className="result-list-item" key={blockIndex}>
                  {block.type === 'numbered' ? (
                    <span className="question-marker">
                      {numberMatch ? numberMatch[1] : blockIndex + 1}
                    </span>
                  ) : (
                    <span className="list-marker">•</span>
                  )}

                  <span>{formatInlineText(itemText)}</span>
                </div>
              )
            }

            return (
              <p className="result-paragraph" key={blockIndex}>
                {formatInlineText(block.text)}
              </p>
            )
          })}
        </article>
      ))}
    </div>
  )
}

function App() {
  const [image, setImage] = useState(null)
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  // Study history state
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)

  // Load saved sessions from browser storage
  const loadHistory = async () => {
    setHistoryLoading(true)

    try {
      const sessions = await getStudySessions()
      setHistory(sessions)
    } catch (error) {
      console.error('Could not load study history:', error)
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setResult('Image size must be less than 10 MB.')
      event.target.value = ''
      return
    }

    const reader = new FileReader()

    reader.onloadend = () => {
      setImage(reader.result)
      setResult('')
      setSaveMessage('')
    }

    reader.readAsDataURL(file)
  }

  const analyzeImage = async () => {
    if (!image || loading) return

    setLoading(true)
    setResult('')
    setSaveMessage('')

    try {
      const apiUrl =
        import.meta.env.VITE_API_URL || 'http://localhost:5000'

      const response = await fetch(`${apiUrl}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Image analysis failed.')
      }

      const analysisResult = data.result || 'No result was returned.'

      setResult(analysisResult)

      try {
        await saveStudySession({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title: `Study Session ${new Date().toLocaleDateString()}`,
          image,
          result: analysisResult,
          createdAt: new Date().toISOString(),
        })

        setSaveMessage('✓ Study session saved to your browser.')
        await loadHistory()
      } catch (storageError) {
        console.error('Could not save study history:', storageError)
        setSaveMessage(
          'Your notes are ready, but this session could not be saved.'
        )
      }
    } catch (error) {
      setResult(
        `Error: ${error.message || 'Unable to connect to the server.'}`
      )
    } finally {
      setLoading(false)
    }
  }

  const openSavedSession = (session) => {
    setImage(session.image)
    setResult(session.result)
    setSaveMessage('Opened saved study session.')

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  const handleDeleteSession = async (id) => {
    try {
      await deleteStudySession(id)
      await loadHistory()
      setSaveMessage('Study session deleted.')
    } catch (error) {
      console.error('Could not delete session:', error)
      setSaveMessage('Could not delete this study session.')
    }
  }

  const handleClearHistory = async () => {
    if (!window.confirm('Delete all saved study sessions?')) return

    try {
      await clearStudyHistory()
      await loadHistory()
      setSaveMessage('All study history has been cleared.')
    } catch (error) {
      console.error('Could not clear history:', error)
      setSaveMessage('Could not clear study history.')
    }
  }

  const scrollToResultSection = (sectionId) => {
    const section = document.getElementById(sectionId)

    if (section) {
      section.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          📚 <span>Snap &amp; Study</span>
        </div>

        <div className="badge">AI Vision Study Assistant</div>
      </header>

      <main className="main">
        {/* Hero */}
        <section className="hero">
          <div className="hero-icon">✦</div>
          <p className="hero-eyebrow">YOUR PERSONAL AI STUDY PARTNER</p>

          <h1>
            Turn any image into
            <span className="hero-highlight"> a study session.</span>
          </h1>

          <p className="hero-description">
            Upload textbook pages, handwritten notes, diagrams, or
            questions. Get clear explanations and study smarter with AI.
          </p>
        </section>

        {/* Image upload */}
        <section className="upload-card">
          {!image ? (
            <>
              <div className="upload-icon">📚</div>
              <h2>Start with your study material</h2>

              <p>
                Choose a clear image of your notes, textbook, or diagram.
              </p>

              <label className="upload-button">
                <span>＋ Choose an Image</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleImageUpload}
                  hidden
                />
              </label>

              <small>PNG, JPG or WebP · Maximum 10 MB</small>
            </>
          ) : (
            <>
              <div className="upload-heading">
                <div>
                  <p className="card-eyebrow">READY TO LEARN</p>
                  <h2>Your Study Material</h2>
                </div>

                <span className="image-status">✓ Image added</span>
              </div>

              <img
                src={image}
                alt="Uploaded study material"
                className="uploaded-image"
              />

              <div className="action-buttons">
                <button
                  type="button"
                  className="upload-button secondary-button"
                  onClick={() => {
                    setImage(null)
                    setResult('')
                    setSaveMessage('')
                  }}
                  disabled={loading}
                >
                  Choose Another Image
                </button>

                <button
                  type="button"
                  className="analyze-button"
                  onClick={analyzeImage}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="loading-spinner" />
                      Analyzing your image...
                    </>
                  ) : (
                    <>
                      ✦ Analyze with AI <span>→</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </section>

        {/* Loading indicator */}
        {loading && (
          <section className="loading-card" aria-live="polite">
            <span className="loading-spinner" />
            <div>
              <h3>Creating your study notes</h3>
              <p>
                Our AI is reading your image and organizing the key ideas.
              </p>
            </div>
          </section>
        )}

        {/* AI results */}
        {result && !loading && (
          <section className="result-card" id="study-results">
            <div className="result-header">
              <div>
                <p className="card-eyebrow">YOUR PERSONAL STUDY GUIDE</p>
                <h2>AI Study Assistant</h2>
                <p className="result-subtitle">
                  Your learning material, made easier to understand.
                </p>
              </div>

              <div className="result-header-icon">✦</div>
            </div>

            <div className="result-content">
              {renderFormattedResult(result)}
            </div>

            {saveMessage && (
              <p className="save-status" role="status">
                {saveMessage}
              </p>
            )}
          </section>
        )}

        {/* Feature shortcuts */}
        <section className="features">
          <button
            type="button"
            className="feature-card"
            onClick={() => scrollToResultSection('ai-explanation')}
            disabled={!result || loading}
          >
            <div className="feature-icon">🧠</div>
            <h3>AI Explanation</h3>
            <p>
              Break down difficult topics into simple, understandable ideas.
            </p>
            <span className="feature-link">Explore explanation →</span>
          </button>

          <button
            type="button"
            className="feature-card"
            onClick={() => scrollToResultSection('smart-summary')}
            disabled={!result || loading}
          >
            <div className="feature-icon">📝</div>
            <h3>Smart Summary</h3>
            <p>
              Review the essential concepts without the extra clutter.
            </p>
            <span className="feature-link">View summary →</span>
          </button>

          <button
            type="button"
            className="feature-card"
            onClick={() => scrollToResultSection('practice-learn')}
            disabled={!result || loading}
          >
            <div className="feature-icon">💡</div>
            <h3>Practice &amp; Learn</h3>
            <p>
              Reinforce your understanding with useful practice questions.
            </p>
            <span className="feature-link">Start practicing →</span>
          </button>
        </section>

        {/* Study history */}
        <section className="history-section" id="study-history">
          <div className="history-header">
            <div>
              <p className="card-eyebrow">YOUR LEARNING JOURNEY</p>
              <h2>Study History</h2>
              <p className="history-subtitle">
                Revisit your saved images and AI-generated notes.
              </p>
            </div>

            <span className="history-count">
              {history.length} saved
            </span>
          </div>

          {historyLoading ? (
            <p className="history-loading">
              Loading your study history...
            </p>
          ) : history.length === 0 ? (
            <div className="history-empty">
              <div className="history-empty-icon">📚</div>
              <h3>Your study space starts here</h3>
              <p>
                Analyze an image and your study notes will appear here
                so you can revisit them later.
              </p>
            </div>
          ) : (
            <>
              <div className="history-grid">
                {history.map((session) => (
                  <article className="history-card" key={session.id}>
                    {session.image && (
                      <img
                        className="history-image"
                        src={session.image}
                        alt="Saved study material"
                      />
                    )}

                    <h3>{session.title || 'Study Session'}</h3>

                    <p className="history-date">
                      {new Date(session.createdAt).toLocaleString()}
                    </p>

                    <div className="history-card-actions">
                      <button
                        type="button"
                        className="history-open-button"
                        onClick={() => openSavedSession(session)}
                      >
                        Open Notes
                      </button>

                      <button
                        type="button"
                        className="history-delete-button"
                        onClick={() => handleDeleteSession(session.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div style={{ marginTop: '22px', textAlign: 'right' }}>
                <button
                  type="button"
                  className="history-clear-button"
                  onClick={handleClearHistory}
                >
                  Clear All History
                </button>
              </div>
            </>
          )}
        </section>
      </main>

      <footer>
        <span>✦</span> Made for curious minds · Snap &amp; Study
      </footer>
    </div>
  )
}

export default App