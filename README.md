
# Smart Resume Analyzer (resumind)

![hero image](readme/hero.webp)

A lightweight, privacy-first web app that analyzes uploaded PDF resumes, extracts text and images, runs simple ATS-readiness checks, and surfaces an easy-to-understand report with visual score badges and suggestions.

## Quick links

- Live routes: `/` (home), `/auth`, `/upload`, `/resume/:id`, `/wipe` — defined in `app/routes.ts`.
- Main app entry: `app/root.tsx`

## Why this project

Resumind is aimed at job seekers who want quick, actionable feedback on how well their resume will be parsed by Applicant Tracking Systems (ATS). It focuses on clarity, visual summaries, and safe local-first handling of uploaded files.

## Visual highlights

- Clean Tailwind UI with score badges and gauges.
- PDF preview thumbnails and full-page previews.
- Simple icons and info states (good / warning / poor) for quick scanning.

## Install & run

Prerequisites: Node.js 18+ and npm.

Install dependencies:

```powershell
npm install
```

Run locally (dev server with hot reload):

```powershell
npm run dev
```

Build for production:

```powershell
npm run build
```

Serve the built server:

```powershell
npm run start
```

Typecheck / generate route types:

```powershell
npm run typecheck
```

## Project layout (concise)

- `app/`
  - `components/` — UI components (Uploader, ResumeCard, Score visuals, Navbar, etc.)
  - `lib/` — helpers (e.g., `pdf2img.ts`, `puter.ts`, `utils.ts`)
  - `routes/` — route pages (`home.tsx`, `upload.tsx`, `resume.tsx`, `auth.tsx`, `wipe.tsx`)
- `public/` — static assets and `pdf.worker.min.mjs`
- `readme/` — screenshots / hero used in this README
- `constants/`, `types/` — small shared files

## How puter.js works (implementation notes)

Puter is a small runtime API surface expected to be injected onto `window.puter` at runtime. The app uses a small Zustand store wrapper `app/lib/puter.ts` (`usePuterStore`) to safely access the API and expose async helpers.

High-level contract (exposed on `window.puter`):

- auth: { isSignedIn(): Promise<boolean>, getUser(): Promise<PuterUser>, signIn(), signOut() }
- fs: { write(path, data), read(path), upload(files), delete(path), readdir(path) }
- ai: { chat(prompt, imageURL?, testMode?, options?), img2txt(image) }
- kv: { get(key), set(key, value), delete(key), list(pattern, returnValues?), flush() }

Key points from `app/lib/puter.ts`:

- The store starts in a loading state and exposes `init()` which checks for `window.puter`.
- If `window.puter` is not present immediately, the store polls every 100ms for up to 10s. If still missing, it sets an error: "Puter.js failed to load within 10 seconds".
- All interactions with the runtime are guarded: when `window.puter` is missing the store sets a helpful error and returns gracefully.
- Auth flow in the store:
  - `checkAuthStatus()` calls `puter.auth.isSignedIn()` and, if true, fetches the user with `puter.auth.getUser()` and sets `auth.user` and `auth.isAuthenticated`.
  - `signIn()` calls `puter.auth.signIn()` then re-checks status.
  - `signOut()` calls `puter.auth.signOut()` and clears the user on success.
- FS helpers are thin wrappers around `puter.fs.*` methods: `write`, `read`, `upload`, `delete`, `readdir`.
- AI helpers:
  - `chat()` delegates to `puter.ai.chat(...)` (used for feedback generation and complex completions).
  - `img2txt()` delegates to `puter.ai.img2txt(...)` (used for OCR / extracting text from resume images).
- KV (key-value) wrappers: `get`, `set`, `delete`, `list`, `flush`.

Assumptions and notes:

- The README documents the runtime API shape as used; exact server-side or host implementation of `puter` is out of scope. If you run the app without an implementation of `window.puter`, most features will show friendly errors or be no-ops.
- Data returned by `puter.ai.chat` is typed as a generic `AIResponse` in the code; handle it defensively in UI components (check fields before use).

## Workflows (step-by-step)

Below are the user-visible workflows and how the app processes data under the hood.

1) Upload workflow
	- User visits `/upload` and drops a PDF into the `FileUploader` (uses `react-dropzone`).
	- The uploader calls `usePuterStore().fs.upload(files)` which delegates to `window.puter.fs.upload`.
	- On upload success the code stores file metadata (id/path) in the app state or `puter.kv` and navigates to `/resume/:id`.
	- The app converts the uploaded PDF into images using `app/lib/pdf2img.ts` (uses `pdfjs-dist` worker shipped in `public/pdf.worker.min.mjs`) and caches thumbnails.
	- For each page image the app may call `usePuterStore().ai.img2txt(imageBlob)` to OCR the page. OCR output is used for keyword extraction and scoring.

2) Scoring & summary generation
	- Extracted text from OCR or normal text extraction is passed to scoring functions in `app/lib/utils.ts` and UI components.
	- Scoring typically checks: presence of contact info, common section headers (Experience, Education, Skills), keyword density, resume length, and whether content is likely to be parsed by ATS (e.g., avoid complex tables/images in key sections).
	- The app composes a short human-friendly summary and recommendations. It can also call `usePuterStore().ai.chat(...)` to generate improved phrasing or explain the score.

3) Resume view (`/resume/:id`)
	- Loads file metadata and images. If image previews exist, it shows thumbnails and a full-page viewer (`ResumeCard` + `ScoreBadge`).
	- Shows the ATS score, summary, and recommended fixes. The user can download or re-upload an updated resume.

4) Authentication flow (`/auth`)
	- UI calls `usePuterStore().auth.signIn()` which delegates to `puter.auth.signIn()`.
	- On success the store refreshes the user via `puter.auth.getUser()` and updates `auth.user`.
	- `auth.signOut()` signs the user out via `puter.auth.signOut()` and clears local auth state.

5) Wipe / housekeeping (`/wipe`)
	- This route is intended to delete user test artifacts and calls `usePuterStore().fs.*` and `puter.kv.flush()` as needed.
	- Implementation should confirm destructive actions in the UI before calling delete/flush.

## Data shapes (high-level, inferred)

- PuterUser: { id: string, name?: string, email?: string }
- FSItem: { path: string, size?: number, mime?: string, createdAt?: string }
- ChatMessage: { role: 'user' | 'assistant' | 'system', content: string | any[] }
- AIResponse: { text?: string, choices?: any[], metadata?: any }

Note: these are inferred from usage in `app/lib/puter.ts`. Check runtime provider docs for authoritative shapes.

## Edge cases & error handling

- If `window.puter` is unavailable, the app polls for it for 10s and then surfaces an error.
- All async calls wrap runtime calls and set `error` in the global store when operations fail. UI components should read `usePuterStore().error` and present friendly messages.
- PDF worker must be served from `public/pdf.worker.min.mjs` or `pdfjs-dist` will fail to load.

## Troubleshooting

- PDF rendering fails: confirm `public/pdf.worker.min.mjs` exists and is served at the correct path.
- Missing runtime (Puter): If you intend to run the app without `window.puter`, stub the API in the browser for local development, e.g. a small script that attaches a minimal `window.puter` implementation that fulfills `fs` and `ai` primitives.

## Contributing & next steps

- Add a LICENSE (e.g., MIT) if you want an explicit project license.
- Add automated tests and a CI workflow to run `npm run typecheck` and a linter.
- Add example host/runtime for `window.puter` to ease local dev without the full backend.

---

If you'd like, I can:

- Add the hero screenshot inline as a larger image and include alt text.
- Create a minimal `window.puter` dev shim and a short example script in `dev/` so contributors can run the app without an external runtime.
- Produce a CONTRIBUTING.md and MIT LICENSE.

Tell me which you'd like next and I'll implement it.
