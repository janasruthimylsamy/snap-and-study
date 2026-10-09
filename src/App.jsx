import { useState } from 'react'
import './App.css'

function App() {
  const [image, setImage] = useState(null)
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const handleImageUpload = (event) => {
    const file = event.target.files[0]

    if (file) {
      const reader = new FileReader()

      reader.onloadend = () => {
        setImage(reader.result)
        setResult('')
      }

      reader.readAsDataURL(file)
    }
  }

  const analyzeImage = async () => {
    if (!image) return

    setLoading(true)
    setResult('')

    try {
      const response = await fetch('http://localhost:5000/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed')
      }

      setResult(data.result)
    } catch (error) {
      setResult(`❌ ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          📚 <span>Snap & Study</span>
        </div>

        <div className="badge">
          AI Vision Study Assistant
        </div>
      </header>

      <main className="main">

        <section className="hero">
          <div className="hero-icon">✨</div>

          <h1>
            Turn any image into
            <span> a study session.</span>
          </h1>

          <p>
            Upload your textbook page, handwritten notes, diagram,
            or question and let AI help you understand it.
          </p>
        </section>

        <section className="upload-card">

          {!image ? (
            <>
              <div className="upload-icon">📸</div>

              <h2>Upload your study material</h2>

              <p>
                Take a photo or choose an image from your computer.
              </p>

              <label className="upload-button">
                📁 Choose an Image

                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleImageUpload}
                  hidden
                />
              </label>

              <small>
                PNG, JPG or JPEG • Max 10 MB
              </small>
            </>
          ) : (
            <>
              <h2>Your Study Material</h2>

              <img
                src={image}
                alt="Uploaded study material"
                className="uploaded-image"
              />

              <div className="action-buttons">
                <button
                  className="upload-button"
                  onClick={() => {
                    setImage(null)
                    setResult('')
                  }}
                >
                  🔄 Choose Another Image
                </button>

                <button
                  className="analyze-button"
                  onClick={analyzeImage}
                  disabled={loading}
                >
                  {loading ? '🤖 Analyzing...' : '✨ Analyze with AI'}
                </button>
              </div>
            </>
          )}

        </section>

        {result && (
          <section className="result-card">
            <h2>🧠 AI Study Assistant</h2>

            <div className="result-content">
              {result}
            </div>
          </section>
        )}

        <section className="features">

          <div className="feature">
            <div>🧠</div>
            <h3>AI Explanation</h3>
            <p>
              Understand difficult topics in simple language.
            </p>
          </div>

          <div className="feature">
            <div>📝</div>
            <h3>Smart Summary</h3>
            <p>
              Get important points from your study material.
            </p>
          </div>

          <div className="feature">
            <div>💬</div>
            <h3>Ask Questions</h3>
            <p>
              Chat with AI about the uploaded image.
            </p>
          </div>

        </section>

      </main>

      <footer>
        Built for students • Snap & Study
      </footer>
    </div>
  )
}

export default App