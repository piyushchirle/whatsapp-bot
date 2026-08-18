const fetch = require('node-fetch');

const BASE_URL = process.env.OPENCODE_BASE_URL || 'https://opencode.ai/zen/v1';
const API_KEY = process.env.OPENCODE_API_KEY;
const MODEL = process.env.OPENCODE_MODEL || 'nemotron-3-ultra-free';

if (!API_KEY) {
  console.error('[aiClient] Missing OPENCODE_API_KEY in .env');
}

/**
 * Send a chat completion request to OpenCode Zen.
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<string>} assistant reply text
 */
async function getChatCompletion(messages, { retries = 2 } = {}) {
  const url = `${BASE_URL}/chat/completions`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          temperature: 0.7,
          max_tokens: 512,
        }),
        timeout: 30000,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content;

      if (!reply) {
        throw new Error('No content in API response: ' + JSON.stringify(data));
      }

      return reply.trim();
    } catch (err) {
      console.error(`[aiClient] Attempt ${attempt + 1} failed:`, err.message);
      if (attempt === retries) {
        return "Sorry yaar, AI service se response nahi mila. Thodi der baad try karo.";
      }
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

module.exports = { getChatCompletion, MODEL };
