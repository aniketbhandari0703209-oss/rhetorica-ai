# Rhetorica AI

TanStack Start + React + Tailwind CSS v4 + Nitro + Three.js speech coaching app.

## Local setup

1. Open this folder in VS Code.
2. Make sure Node.js 20.19+ or 22.12+ is installed.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Create `.env` from `.env.example` and add your Gemini key:

   ```env
   GEMINI_API_KEY=your_new_key_here
   ```

5. Start development:

   ```bash
   npm run dev
   ```

6. Open http://localhost:3000

## Production build

```bash
npm run build
```

## Vercel

This project includes `vercel.json` with TanStack Start framework detection. Import the Git repository into Vercel and add `GEMINI_API_KEY` under Project Settings → Environment Variables. Do not use the `VITE_` prefix for this secret.

The Gemini calls run through a TanStack server function, so the API key stays server-side.

## Git

Do not commit `.env`, `.env.local`, `node_modules`, `.tanstack`, or generated output. The old GitHub Pages workflow has been removed because this app is a full-stack TanStack Start app and is configured for Vercel/Nitro deployment instead.
