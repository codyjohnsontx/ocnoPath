# OncoPath

AI-powered cancer clinical trial discovery and explanation prototype.

OncoPath helps patients and caregivers search public clinical trial information, understand criteria in plain English, and prepare questions for oncology care teams.

## Safety Boundary

OncoPath does not diagnose cancer, recommend treatment, confirm eligibility, or tell anyone to enroll in a trial. Only oncology care teams and trial teams can determine whether a trial is appropriate.

Search pagination and ordering are documented in
[`docs/SEARCH_ORDERING.md`](docs/SEARCH_ORDERING.md).

## Development

```bash
npm install
npm run dev
```

Optional AI explanation support:

```bash
# Free local AI with Ollama
AI_PROVIDER=ollama
OLLAMA_MODEL=llama3.1:8b
OLLAMA_BASE_URL=http://localhost:11434

# Or paid API mode
AI_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
```

Without an AI provider, the app returns deterministic source-grounded fallback explanations.

## Free Local AI

For a no-cost local setup, install Ollama, then run:

```bash
ollama pull llama3.1:8b
ollama serve
```

Then start OncoPath with:

```bash
AI_PROVIDER=ollama npm run dev
```

Local models are slower than API models and still run through the same safety validator. If Ollama is unavailable or the model output fails validation, OncoPath falls back to a conservative source-grounded explanation.
