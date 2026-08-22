// Copy to ai.config.js (gitignored) and fill in whichever keys you have.
// Every key is OPTIONAL: a provider joins the rotating chain only when its
// key is present. Use Biblely's OWN keys — never reuse another app's.
//
//   Groq        console.groq.com/keys
//   Cerebras    cloud.cerebras.ai
//   SambaNova   cloud.sambanova.ai
//   OpenRouter  openrouter.ai/keys        (free models via :free)
//   Mistral     console.mistral.ai/api-keys
//   GitHub      github.com/settings/tokens (classic token, no scopes)
//   HuggingFace huggingface.co/settings/tokens
//   Cohere      dashboard.cohere.com/api-keys
//
// DeepSeek and Gemini keep their existing config files (deepseek.config.js,
// gemini.config.js) and are folded into the chain automatically.
export const AI_CONFIG = {
  GROQ_API_KEY: '',
  CEREBRAS_API_KEY: '',
  SAMBANOVA_API_KEY: '',
  OPENROUTER_API_KEY: '',
  MISTRAL_API_KEY: '',
  GITHUB_MODELS_TOKEN: '',
  HF_API_KEY: '',
  COHERE_API_KEY: '',
};
