export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is not configured on Vercel."
      });
    }

    const { message, history = [] } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }

    const safeHistory = Array.isArray(history)
      ? history.slice(-10).map(item => ({
          role: item.role === "assistant" ? "assistant" : "user",
          content: String(item.content || "").slice(0, 3000)
        }))
      : [];

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-5-mini",
          instructions:
            "You are Academic Hunters AI. Help students understand school subjects clearly and step by step. Use simple educational language. Do not help students cheat in live examinations.",
          input: [
            ...safeHistory,
            {
              role: "user",
              content: message.trim().slice(0, 4000)
            }
          ],
          max_output_tokens: 1200
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI error:", data);

      return res.status(response.status).json({
        error: data?.error?.message || "AI service error."
      });
    }

    return res.status(200).json({
      text: data.output_text || "Sorry, I could not generate an answer."
    });

  } catch (error) {
    console.error("Server error:", error);

    return res.status(500).json({
      error: "AI server error. Please try again."
    });
  }
}
