export default async function handler(req, res) {
  // 1. Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Safely parse request body and validate input
  const { promptText } = req.body || {};
  if (!promptText || typeof promptText !== 'string' || !promptText.trim()) {
    return res.status(400).json({ error: 'Prompt text is required and must be a valid string.' });
  }

  // 3. Check Vercel environment variables for API Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Missing GEMINI_API_KEY in environment variables.');
    return res.status(500).json({ error: 'API key is missing in server configuration.' });
  }

  try {
    // 4. Construct Gemini API URL using backticks (Template Literals)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // 5. Send POST request with timeout safety controller
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout limit

    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText.trim() }] }]
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const data = await response.json();

    // 6. Handle API response status errors
    if (!response.ok) {
      console.error('Gemini API Error details:', JSON.stringify(data, null, 2));
      const errorMessage = data.error?.message || 'Gemini API rejected the request.';
      return res.status(response.status).json({ error: errorMessage });
    }

    // 7. Safely extract generated response text
    const aiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiResponse) {
      console.error('Unexpected Gemini API response structure:', JSON.stringify(data, null, 2));
      return res.status(502).json({ error: 'Invalid response structure received from Gemini.' });
    }

    return res.status(200).json({ result: aiResponse });

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Gemini API request timed out after 15 seconds.');
      return res.status(540).json({ error: 'Request to AI timed out.' });
    }

    console.error('Server side error:', error);
    return res.status(500).json({ error: 'Internal server error while connecting to AI.' });
  }
}
