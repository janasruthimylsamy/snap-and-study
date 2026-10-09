
const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-3.8-flash'

app.use(cors())
app.use(express.json({ limit: '25mb' }))

app.get('/', (req, res) => {
  res.json({
    message: 'Snap & Study AI server is running!',
  })
})

app.post('/api/analyze', async (req, res) => {
  try {
    const { image } = req.body || {}

    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'Gemini API key is missing. Check your .env file.',
      })
    }

    if (!image || typeof image !== 'string') {
      return res.status(400).json({
        error: 'Please upload a study image.',
      })
    }

    const match = image.match(
      /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/s
    )

    if (!match) {
      return res.status(400).json({
        error: 'Invalid image. Please upload a PNG, JPG, or WebP image.',
      })
    }

    const mimeType = match[1] === 'image/jpg'
      ? 'image/jpeg'
      : match[1]

    const base64Data = match[2]

    const apiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are Snap & Study, an AI vision study assistant.

Carefully analyze the uploaded study material.

Respond using this format:

🧠 SIMPLE EXPLANATION
Explain the topic in simple language suitable for a college student.

📝 SHORT SUMMARY
Summarize the main idea clearly and briefly.

🔑 KEY POINTS
List the important facts, definitions, formulas, or concepts visible in the image.

❓ PRACTICE QUESTIONS
Create 3 useful practice questions based on the material.

If any text in the image is unclear, mention that instead of guessing.
Use clear headings and readable formatting.`,
                },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2048,
          },
        }),
      }
    )

    const data = await apiResponse.json()

    if (!apiResponse.ok) {
      console.error(
        'Gemini API error:',
        apiResponse.status,
        data.error?.message || 'Unknown API error'
      )

      return res.status(apiResponse.status).json({
        error: data.error?.message || 'Gemini API request failed.',
      })
    }

    const result = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || '')
      .join('\n')
      .trim()

    if (!result) {
      return res.status(502).json({
        error: 'The AI returned no text. Please try another image.',
      })
    }

    return res.json({ result })
  } catch (error) {
    console.error('AI ERROR:', error.message)

    return res.status(500).json({
      error: error.message || 'AI analysis failed.',
    })
  }
})

app.listen(PORT, () => {
  console.log(`Snap & Study server running at http://localhost:${PORT}`)
  console.log('Gemini API key loaded:', Boolean(GEMINI_API_KEY))
})
