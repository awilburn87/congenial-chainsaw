// Netlify Serverless Edge Function
// This acts as a middleman. It reads the prompt from the browser,
// secretly attaches the API key from Netlify's vault, and asks Google.

exports.handler = async function(event, context) {
    // Only allow POST requests
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { prompt, systemInstruction } = JSON.parse(event.body);
        
        // This key lives ONLY in Netlify's secure environment variables
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return { statusCode: 500, body: JSON.stringify({ error: "API Key missing in environment" }) };
        }

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] }
        };

        // Forward the request to Google
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // Send Google's answer back to the frontend
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error("Proxy Error:", error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: 'Failed to communicate with GenAI vendor.' }) 
        };
    }
};
