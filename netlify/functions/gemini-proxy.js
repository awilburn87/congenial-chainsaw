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

        // 🛠️ THE FIX: Using the stable gemini-2.5-flash production model
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // If Google rejects the key or payload, pass the error forward
        if (!response.ok) {
            console.error("Google API Error:", data);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: "Google API rejected the request", details: data })
            };
        }

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
