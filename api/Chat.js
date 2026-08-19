export default async function handler(req, res) {
  // 1. Only allow POST requests from our frontend
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Get the prompt sent from the frontend HTML file
  const { promptText } = req.body;

  // 3. Securely pull the API key from Vercel's environment variables
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key is missing in server configuration.' });
  }

  try {
    // 4. Talk to Gemini directly from the server
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}";

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      })
    });

    const data = await response.json();

    // Handle Gemini API errors (like quota limits)
    if (!response.ok) {
      console.error('Gemini API Error:', data);
      return res.status(500).json({ error: 'Gemini API rejected the request.' });
    }

    // 5. Send the clean text back to the frontend
    const aiResponse = data.candidates[0].content.parts[0].text;
    res.status(200).json({ result: aiResponse });

  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: 'Internal server error while connecting to AI.' });
  }
}
