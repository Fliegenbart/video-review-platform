# Video Review UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the customer and admin frontends with stronger styling and a clickable comment timeline while keeping the existing backend contract and live workflow intact.

**Architecture:** Build on top of the existing `ReviewApp` and `AdminApp`, add a small shared timeline utility and a reusable timeline component, then layer the new visual design into the existing React screens. Keep all comment creation, upload, and retrieval on the current `/api` endpoints so deployment remains a low-risk frontend-led change.

**Tech Stack:** React 19, Vite 7, Tailwind CSS, Vitest, React Testing Library

---

## File Map

- Modify: `package.json`
  Add `test` scripts and frontend test dependencies.
- Modify: `vite.config.js`
  Add Vitest configuration for `jsdom` and shared test setup.
- Modify: `index.html`
  Add production-safe font loading and improve document title.
- Modify: `src/index.css`
  Add shared design tokens, background treatment, and timeline/admin polish classes.
- Create: `src/test/setup.js`
  Shared test setup for `@testing-library/jest-dom`.
- Create: `src/timeline.js`
  Pure helpers for time clamping, percent conversion, and timeline click math.
- Create: `src/timeline.test.js`
  Unit tests for the pure timeline helpers.
- Create: `src/components/ReviewTimeline.jsx`
  Shared visual timeline used by the customer page.
- Create: `src/components/ReviewTimeline.test.jsx`
  Component tests for timeline clicks and comment markers.
- Modify: `src/ReviewApp.jsx`
  Customer-side layout refresh, timeline integration, selected timestamp state, and improved comment flow.
- Create: `src/ReviewApp.test.jsx`
  Integration tests for selected timeline time, comment submission, and comment jump behavior.
- Modify: `src/AdminApp.jsx`
  Admin-side layout refresh, inline success/error feedback, compact preview video, and comment jump behavior.
- Create: `src/AdminApp.test.jsx`
  Integration tests for copy-link feedback and admin preview jump behavior.

## Task 1: Add Test Harness and Timeline Math Helpers

**Files:**
- Modify: `package.json`
- Modify: `vite.config.js`
- Create: `src/test/setup.js`
- Create: `src/timeline.test.js`
- Create: `src/timeline.js`

- [ ] **Step 1: Add test scripts and Vitest support**

Update `package.json`:

```json
{
  "scripts": {
    "dev": "vite --configLoader native",
    "dev:server": "node --watch server/index.js",
    "build": "vite build",
    "preview": "vite preview",
    "start": "node server/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@vitejs/plugin-react": "^5.0.0",
    "autoprefixer": "^10.4.21",
    "jsdom": "^26.1.0",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.17",
    "vite": "^7.0.0",
    "vitest": "^2.1.8"
  }
}
```

Update `vite.config.js`:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:5175',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
  },
});
```

Create `src/test/setup.js`:

```js
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 2: Install the new test dependencies**

Run:

```bash
npm install
```

Expected:

- `package-lock.json` updates with the new test dependencies
- no install errors

- [ ] **Step 3: Write the failing timeline helper test**

Create `src/timeline.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { clientXToTime, clampTime, timeToPercent } from './timeline.js';

describe('timeline helpers', () => {
  it('clamps time within the video duration', () => {
    expect(clampTime(-5, 120)).toBe(0);
    expect(clampTime(40, 120)).toBe(40);
    expect(clampTime(999, 120)).toBe(120);
  });

  it('converts a timestamp into a safe percent', () => {
    expect(timeToPercent(30, 120)).toBe(25);
    expect(timeToPercent(200, 120)).toBe(100);
    expect(timeToPercent(10, 0)).toBe(0);
  });

  it('maps a timeline click to a video time', () => {
    expect(
      clientXToTime({
        clientX: 150,
        left: 50,
        width: 200,
        duration: 100,
      })
    ).toBe(50);
  });
});
```

- [ ] **Step 4: Run the helper test and verify it fails**

Run:

```bash
npm run test -- src/timeline.test.js
```

Expected:

- FAIL
- error mentions `./timeline.js` does not exist yet or export is missing

- [ ] **Step 5: Write the minimal timeline helper implementation**

Create `src/timeline.js`:

```js
export function clampTime(timeSec, duration) {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const safeTime = Number.isFinite(timeSec) ? timeSec : 0;
  return Math.min(Math.max(safeTime, 0), safeDuration);
}

export function timeToPercent(timeSec, duration) {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return (clampTime(timeSec, duration) / duration) * 100;
}

export function clientXToTime({ clientX, left, width, duration }) {
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(width) || width <= 0) {
    return 0;
  }

  const rawPercent = (clientX - left) / width;
  const boundedPercent = Math.min(Math.max(rawPercent, 0), 1);
  return duration * boundedPercent;
}
```

- [ ] **Step 6: Run the helper test and verify it passes**

Run:

```bash
npm run test -- src/timeline.test.js
```

Expected:

- PASS
- 3 tests passed

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.js src/test/setup.js src/timeline.js src/timeline.test.js
git commit -m "test: add timeline helper test harness"
```

## Task 2: Build the Shared Review Timeline Component

**Files:**
- Create: `src/components/ReviewTimeline.jsx`
- Create: `src/components/ReviewTimeline.test.jsx`
- Modify: `src/index.css`
- Test: `src/components/ReviewTimeline.test.jsx`

- [ ] **Step 1: Write the failing component test**

Create `src/components/ReviewTimeline.test.jsx`:

```jsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReviewTimeline from './ReviewTimeline.jsx';

describe('ReviewTimeline', () => {
  it('seeks to the clicked time on the track', () => {
    const onSeek = vi.fn();
    const onSelectTime = vi.fn();

    render(
      <ReviewTimeline
        duration={120}
        currentTime={30}
        selectedTimeSec={45}
        comments={[]}
        onSeek={onSeek}
        onSelectTime={onSelectTime}
        onJumpToComment={vi.fn()}
      />
    );

    const track = screen.getByRole('button', { name: /kommentar-timeline/i });
    track.getBoundingClientRect = () => ({
      left: 20,
      width: 200,
      top: 0,
      height: 16,
      right: 220,
      bottom: 16,
    });

    fireEvent.click(track, { clientX: 170 });

    expect(onSelectTime).toHaveBeenCalledWith(90);
    expect(onSeek).toHaveBeenCalledWith(90);
  });

  it('renders comment markers and jumps to the linked comment', () => {
    const onJumpToComment = vi.fn();

    render(
      <ReviewTimeline
        duration={120}
        currentTime={30}
        selectedTimeSec={45}
        comments={[
          { id: 'c1', timeSec: 15, text: 'Intro' },
          { id: 'c2', timeSec: 80, text: 'CTA' },
        ]}
        onSeek={vi.fn()}
        onSelectTime={vi.fn()}
        onJumpToComment={onJumpToComment}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /kommentar bei 00:01:20/i }));

    expect(onJumpToComment).toHaveBeenCalledWith({
      id: 'c2',
      timeSec: 80,
      text: 'CTA',
    });
  });
});
```

- [ ] **Step 2: Run the component test and verify it fails**

Run:

```bash
npm run test -- src/components/ReviewTimeline.test.jsx
```

Expected:

- FAIL
- error mentions `./ReviewTimeline.jsx` does not exist yet

- [ ] **Step 3: Write the minimal timeline component**

Create `src/components/ReviewTimeline.jsx`:

```jsx
import { clientXToTime, timeToPercent } from '../timeline.js';
import { formatTimecode } from '../api.js';

export default function ReviewTimeline({
  duration,
  currentTime,
  selectedTimeSec,
  comments,
  onSeek,
  onSelectTime,
  onJumpToComment,
}) {
  function handleTrackClick(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const nextTime = clientXToTime({
      clientX: event.clientX,
      left: rect.left,
      width: rect.width,
      duration,
    });

    onSelectTime(nextTime);
    onSeek(nextTime);
  }

  return (
    <div className="timeline-shell">
      <div className="timeline-meta">
        <span>Timeline</span>
        <span>{formatTimecode(selectedTimeSec ?? currentTime ?? 0)}</span>
      </div>

      <button
        type="button"
        className="timeline-track"
        aria-label="Kommentar-Timeline"
        onClick={handleTrackClick}
      >
        <span
          className="timeline-progress"
          style={{ width: `${timeToPercent(currentTime, duration)}%` }}
        />
        <span
          className="timeline-selected"
          style={{ left: `${timeToPercent(selectedTimeSec, duration)}%` }}
        />

        {comments.map((comment) => (
          <span
            key={comment.id}
            className="timeline-marker-wrap"
            style={{ left: `${timeToPercent(comment.timeSec, duration)}%` }}
          >
            <button
              type="button"
              className="timeline-marker"
              aria-label={`Kommentar bei ${formatTimecode(comment.timeSec)}`}
              onClick={(event) => {
                event.stopPropagation();
                onJumpToComment(comment);
              }}
            />
          </span>
        ))}
      </button>
    </div>
  );
}
```

Append the matching CSS to `src/index.css`:

```css
:root {
  --bg-base: #07111f;
  --bg-panel: rgba(10, 20, 37, 0.78);
  --bg-panel-strong: rgba(12, 25, 46, 0.92);
  --line-soft: rgba(255, 255, 255, 0.12);
  --text-strong: #f7f8fb;
  --text-soft: #b4c0d3;
  --accent: #ff6b4a;
  --accent-soft: #ff8b70;
  --success: #49d39a;
}

.timeline-shell {
  display: grid;
  gap: 0.75rem;
}

.timeline-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-soft);
}

.timeline-track {
  position: relative;
  height: 18px;
  width: 100%;
  border: 1px solid var(--line-soft);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  overflow: visible;
}

.timeline-progress {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent), var(--accent-soft));
}

.timeline-selected {
  position: absolute;
  top: -4px;
  width: 2px;
  height: 24px;
  background: #fff;
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.08);
}

.timeline-marker-wrap {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
}

.timeline-marker {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.7);
  background: var(--accent);
  cursor: pointer;
}
```

- [ ] **Step 4: Run the component test and verify it passes**

Run:

```bash
npm run test -- src/components/ReviewTimeline.test.jsx
```

Expected:

- PASS
- both timeline interaction tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/ReviewTimeline.jsx src/components/ReviewTimeline.test.jsx src/index.css
git commit -m "feat: add shared review timeline"
```

## Task 3: Integrate the Timeline and Refresh the Customer Review Page

**Files:**
- Modify: `index.html`
- Modify: `src/index.css`
- Modify: `src/ReviewApp.jsx`
- Create: `src/ReviewApp.test.jsx`
- Test: `src/ReviewApp.test.jsx`

- [ ] **Step 1: Write the failing customer integration test**

Create `src/ReviewApp.test.jsx`:

```jsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReviewApp from './ReviewApp.jsx';

vi.mock('./components/ReviewTimeline.jsx', () => ({
  default: ({ onSelectTime, onJumpToComment, comments }) => (
    <div>
      <button type="button" onClick={() => onSelectTime(42)}>
        Pick timeline time
      </button>
      <button type="button" onClick={() => onJumpToComment(comments[0])}>
        Jump to first comment
      </button>
    </div>
  ),
}));

describe('ReviewApp', () => {
  beforeEach(() => {
    global.fetch = vi.fn(async (input, init = {}) => {
      const url = String(input);
      const method = init.method || 'GET';

      if (url === '/api/share/demo' && method === 'GET') {
        return new Response(
          JSON.stringify({
            project: { title: 'Launch Cut', createdAt: '2026-04-07T18:00:00.000Z', hasVideo: true },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url === '/api/share/demo/comments' && method === 'GET') {
        return new Response(
          JSON.stringify({
            comments: [{ id: 'c1', authorName: 'Anna', timeSec: 12, text: 'Title zu klein', status: 'open', createdAt: '2026-04-07T18:00:00.000Z' }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url === '/api/share/demo/comments' && method === 'POST') {
        return new Response(JSON.stringify({ comment: { id: 'c2' } }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`Unexpected request: ${method} ${url}`);
    });

    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue();
  });

  it('submits the selected timeline time instead of the current video position', async () => {
    render(<ReviewApp token="demo" />);

    await screen.findByText('Kommentar hinzufügen');

    fireEvent.click(screen.getByText('Pick timeline time'));
    fireEvent.change(screen.getByLabelText('Kommentar'), {
      target: { value: 'Bitte den Einstieg straffen.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Kommentar senden' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/share/demo/comments',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            authorName: '',
            text: 'Bitte den Einstieg straffen.',
            timeSec: 42,
          }),
        })
      );
    });
  });
});
```

- [ ] **Step 2: Run the customer integration test and verify it fails**

Run:

```bash
npm run test -- src/ReviewApp.test.jsx
```

Expected:

- FAIL
- current implementation still submits `video.currentTime` and does not use the selected timeline time

- [ ] **Step 3: Implement the selected-time flow and customer layout refresh**

Update `index.html`:

```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap"
      rel="stylesheet"
    />
    <title>Video Review Studio</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

Update the main structure in `src/ReviewApp.jsx`:

```jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest, formatTimecode } from './api.js';
import ReviewTimeline from './components/ReviewTimeline.jsx';

export default function ReviewApp({ token }) {
  const videoRef = useRef(null);
  const [state, setState] = useState('loading');
  const [project, setProject] = useState(null);
  const [comments, setComments] = useState([]);
  const [error, setError] = useState(null);
  const [authorName, setAuthorName] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [selectedTimeSec, setSelectedTimeSec] = useState(null);
  const [activeCommentId, setActiveCommentId] = useState(null);

  const videoSrc = useMemo(() => (token ? `/api/share/${token}/video` : null), [token]);
  const activeTimeSec = selectedTimeSec ?? currentTimeSec;

  async function refresh() {
    const p = await apiRequest(`/api/share/${token}`);
    const c = await apiRequest(`/api/share/${token}/comments`);
    setProject(p.project);
    setComments(c.comments || []);
  }

  function seekVideo(timeSec) {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Number(timeSec) || 0;
  }

  function handleSelectTime(timeSec) {
    setSelectedTimeSec(timeSec);
    seekVideo(timeSec);
  }

  function handleJumpToComment(comment) {
    setActiveCommentId(comment.id);
    setSelectedTimeSec(comment.timeSec);
    seekVideo(comment.timeSec);
    videoRef.current?.play?.().catch(() => {});
  }

  async function submitComment() {
    const cleanText = text.trim();
    if (!cleanText) return;

    setBusy(true);
    setError(null);
    try {
      await apiRequest(`/api/share/${token}/comments`, {
        method: 'POST',
        json: {
          authorName: authorName.trim(),
          text: cleanText,
          timeSec: activeTimeSec,
        },
      });
      setText('');
      setSelectedTimeSec(null);
      await refresh();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!token) {
      setState('error');
      setError(new Error('Missing token'));
      return;
    }

    setState('loading');
    refresh()
      .then(() => setState('ready'))
      .catch((err) => {
        setError(err);
        setState('error');
      });
  }, [token]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncFromVideo = () => {
      setCurrentTimeSec(video.currentTime || 0);
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setDurationSec(video.duration);
      }
    };

    syncFromVideo();
    video.addEventListener('timeupdate', syncFromVideo);
    video.addEventListener('loadedmetadata', syncFromVideo);

    return () => {
      video.removeEventListener('timeupdate', syncFromVideo);
      video.removeEventListener('loadedmetadata', syncFromVideo);
    };
  }, [videoSrc, state]);

  return (
    <div className="review-page">
      <div className="review-page__glow" />
      <div className="review-shell">
        <header className="review-hero">
          <div>
            <p className="eyebrow">Client Review</p>
            <h1>Video Review</h1>
            <p className="lede">Kommentare direkt an der richtigen Stelle im Video erfassen.</p>
          </div>
          <a href="/">Admin</a>
        </header>

        <div className="review-grid">
          <section className="review-stage">
            <div className="review-stage__panel">
              <div className="review-stage__head">
                <div>
                  <span className="eyebrow">Projekt</span>
                  <h2>{project?.title}</h2>
                </div>
                <div className="timestamp-pill">{formatTimecode(activeTimeSec)}</div>
              </div>

              <div className="review-video-frame">
                <video ref={videoRef} controls className="review-video" src={videoSrc} />
              </div>

              <ReviewTimeline
                duration={durationSec}
                currentTime={currentTimeSec}
                selectedTimeSec={selectedTimeSec}
                comments={comments}
                onSeek={seekVideo}
                onSelectTime={handleSelectTime}
                onJumpToComment={handleJumpToComment}
              />

              <div className="review-composer">
                <div className="review-composer__head">
                  <div>
                    <h3>Kommentar hinzufügen</h3>
                    <p>Nutze die aktuelle Stelle oder klicke direkt in die Timeline.</p>
                  </div>
                  <button type="button" className="ghost-button" onClick={() => handleSelectTime(videoRef.current?.currentTime || 0)}>
                    Aktuelle Stelle übernehmen
                  </button>
                </div>

                <div className="review-form-grid">
                  <label className="field-block">
                    <span>Dein Name (optional)</span>
                    <input value={authorName} onChange={(event) => setAuthorName(event.target.value)} placeholder="z.B. Max Mustermann" />
                  </label>

                  <label className="field-block">
                    <span>Kommentar</span>
                    <textarea
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      placeholder="Was soll an dieser Stelle geaendert werden?"
                      rows={4}
                    />
                  </label>
                </div>

                <div className="review-composer__footer">
                  <div className="timestamp-pill timestamp-pill--soft">Ausgewählt: {formatTimecode(activeTimeSec)}</div>
                  <button type="button" className="primary-button" onClick={submitComment} disabled={busy || !project?.hasVideo}>
                    Kommentar senden
                  </button>
                </div>
              </div>
            </div>
          </section>

          <aside className="review-sidebar">
            <div className="review-sidebar__header">
              <h2>Kommentare ({comments.length})</h2>
              <p>Klicke auf einen Kommentar, um direkt zu dieser Stelle zu springen.</p>
            </div>

            <div className="review-comment-list">
              {comments
                .slice()
                .sort((a, b) => (a.timeSec || 0) - (b.timeSec || 0))
                .map((comment) => (
                  <button
                    key={comment.id}
                    type="button"
                    className={[
                      'review-comment',
                      activeCommentId === comment.id ? 'is-active' : '',
                      comment.status === 'resolved' ? 'is-resolved' : '',
                    ].join(' ')}
                    onClick={() => handleJumpToComment(comment)}
                  >
                    <div className="review-comment__meta">
                      <span>{comment.authorName || 'Kunde'}</span>
                      <span>{formatTimecode(comment.timeSec || 0)}</span>
                    </div>
                    <p>{comment.text}</p>
                  </button>
                ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
```

Append the page-level styling to `src/index.css`:

```css
html,
body,
#root {
  height: 100%;
}

body {
  margin: 0;
  font-family: 'Manrope', system-ui, sans-serif;
  color: var(--text-strong);
  background:
    radial-gradient(circle at top left, rgba(255, 107, 74, 0.18), transparent 30%),
    radial-gradient(circle at top right, rgba(73, 211, 154, 0.12), transparent 26%),
    linear-gradient(180deg, #040916 0%, #091221 100%);
}

h1,
h2,
h3,
.eyebrow,
.timestamp-pill {
  font-family: 'Space Grotesk', sans-serif;
}

.review-page {
  position: relative;
  min-height: 100%;
}

.review-page__glow {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent 30%);
}

.review-shell {
  position: relative;
  z-index: 1;
  width: min(1320px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 2rem 0 3rem;
}

.review-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: minmax(0, 1.65fr) minmax(300px, 0.9fr);
}

.review-stage__panel,
.review-sidebar {
  border: 1px solid var(--line-soft);
  border-radius: 28px;
  background: var(--bg-panel);
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.28);
}

.review-stage__panel {
  padding: 1.25rem;
}

.review-video-frame {
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: #020611;
  margin: 1rem 0;
}

.review-video {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
}

.review-composer {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--line-soft);
}

.review-form-grid {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.field-block {
  display: grid;
  gap: 0.5rem;
  color: var(--text-soft);
}

.field-block input,
.field-block textarea {
  width: 100%;
  border-radius: 16px;
  border: 1px solid var(--line-soft);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-strong);
  padding: 0.85rem 1rem;
}

.review-composer__footer {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.primary-button,
.ghost-button {
  border-radius: 999px;
  padding: 0.8rem 1.1rem;
  font: inherit;
  cursor: pointer;
}

.primary-button {
  border: none;
  color: #fff;
  background: linear-gradient(90deg, var(--accent), var(--accent-soft));
}

.ghost-button {
  border: 1px solid var(--line-soft);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-strong);
}

.review-sidebar {
  padding: 1rem;
}

.review-comment-list {
  display: grid;
  gap: 0.75rem;
}

.review-comment {
  width: 100%;
  text-align: left;
  border: 1px solid var(--line-soft);
  border-radius: 18px;
  padding: 0.95rem 1rem;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-strong);
}

.review-comment.is-active {
  border-color: rgba(255, 139, 112, 0.8);
  box-shadow: 0 0 0 1px rgba(255, 139, 112, 0.35);
}

.review-comment.is-resolved {
  opacity: 0.72;
}

.review-comment__meta {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  color: var(--text-soft);
  font-size: 0.82rem;
}

@media (max-width: 980px) {
  .review-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Run the customer integration test and verify it passes**

Run:

```bash
npm run test -- src/ReviewApp.test.jsx
```

Expected:

- PASS
- the POST body now contains the selected timeline time

- [ ] **Step 5: Run a build smoke test**

Run:

```bash
npm run build
```

Expected:

- PASS
- Vite build completes without JSX or CSS errors

- [ ] **Step 6: Commit**

```bash
git add index.html src/index.css src/ReviewApp.jsx src/ReviewApp.test.jsx
git commit -m "feat: refresh customer review experience"
```

## Task 4: Refresh the Admin Page and Add Preview Jumping

**Files:**
- Modify: `src/AdminApp.jsx`
- Modify: `src/index.css`
- Create: `src/AdminApp.test.jsx`
- Test: `src/AdminApp.test.jsx`

- [ ] **Step 1: Write the failing admin integration test**

Create `src/AdminApp.test.jsx`:

```jsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminApp from './AdminApp.jsx';

describe('AdminApp', () => {
  beforeEach(() => {
    global.fetch = vi.fn(async (input, init = {}) => {
      const url = String(input);
      const method = init.method || 'GET';

      if (url === '/api/admin/projects' && method === 'GET') {
        return new Response(
          JSON.stringify({
            projects: [
              {
                id: 'p1',
                title: 'Spring Campaign',
                createdAt: '2026-04-07T18:00:00.000Z',
                shareToken: 'demo-token',
                sharePath: '/r/demo-token',
                hasVideo: true,
                video: { originalName: 'spring.mp4', size: 1024, uploadedAt: '2026-04-07T18:00:00.000Z' },
                commentCounts: { total: 1, open: 1 },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url === '/api/admin/projects/p1/comments' && method === 'GET') {
        return new Response(
          JSON.stringify({
            comments: [
              {
                id: 'c1',
                authorName: 'Lena',
                timeSec: 18,
                text: 'Titel etwas groesser',
                status: 'open',
                createdAt: '2026-04-07T18:00:00.000Z',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`Unexpected request: ${method} ${url}`);
    });

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(),
      },
    });

    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue();
  });

  it('shows copy feedback and jumps the preview video to the clicked comment', async () => {
    const { container } = render(<AdminApp />);

    await screen.findByText('Projekte');
    fireEvent.click(screen.getByText('Spring Campaign'));

    await screen.findByText('Titel etwas groesser');
    fireEvent.click(screen.getByRole('button', { name: 'Link kopieren' }));

    await waitFor(() => {
      expect(screen.getByText('Link kopiert')).toBeInTheDocument();
    });

    const video = container.querySelector('video');
    Object.defineProperty(video, 'currentTime', { value: 0, writable: true });

    fireEvent.click(screen.getByText('Titel etwas groesser'));

    expect(video.currentTime).toBe(18);
  });
});
```

- [ ] **Step 2: Run the admin integration test and verify it fails**

Run:

```bash
npm run test -- src/AdminApp.test.jsx
```

Expected:

- FAIL
- current implementation still uses `alert('Link kopiert')` and has no preview video to jump

- [ ] **Step 3: Implement admin preview, inline feedback, and visual cleanup**

Update the main structure in `src/AdminApp.jsx`:

```jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest, formatTimecode } from './api.js';

export default function AdminApp() {
  const previewVideoRef = useRef(null);
  const [authState, setAuthState] = useState('checking');
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);
  const [flashMessage, setFlashMessage] = useState(null);
  const [password, setPassword] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsBusy, setCommentsBusy] = useState(false);
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  async function refreshProjects() {
    const data = await apiRequest('/api/admin/projects');
    setProjects(data.projects || []);
    setAuthState('signed_in');
  }

  useEffect(() => {
    refreshProjects()
      .catch((err) => {
        if (err?.status === 401) {
          setAuthState('signed_out');
          return;
        }
        setError(err);
        setAuthState('signed_out');
      });
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setComments([]);
      return;
    }

    setCommentsBusy(true);
    apiRequest(`/api/admin/projects/${selectedProjectId}/comments`)
      .then((data) => setComments(data.comments || []))
      .finally(() => setCommentsBusy(false));
  }, [selectedProjectId]);

  async function copyShareLink(project) {
    try {
      await navigator.clipboard.writeText(buildShareUrl(project.sharePath));
      setFlashMessage({ type: 'success', text: 'Link kopiert' });
    } catch {
      setFlashMessage({ type: 'error', text: 'Link konnte nicht kopiert werden' });
    }
  }

  function jumpPreviewTo(timeSec) {
    if (!previewVideoRef.current) return;
    previewVideoRef.current.currentTime = Number(timeSec) || 0;
    previewVideoRef.current.play().catch(() => {});
  }

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow">Admin Studio</p>
            <h1>Video Editor</h1>
            <p className="lede">Uploads, Freigabelinks und Kommentare an einem Ort.</p>
          </div>
          <div className="admin-actions">
            <button type="button" className="ghost-button" onClick={() => window.open('https://video-editor.labpulse.ai', '_blank')}>
              Live URL
            </button>
          </div>
        </header>

        {flashMessage ? (
          <div className={`status-banner status-banner--${flashMessage.type}`}>{flashMessage.text}</div>
        ) : null}

        {authState !== 'signed_in' ? (
          <section className="admin-panel admin-login-card">
            <h2>Admin Login</h2>
            <form className="admin-login-form" onSubmit={handleSignIn}>
              <label className="field-block">
                <span>Passwort</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="ADMIN_PASSWORD"
                />
              </label>
              <button type="submit" className="primary-button" disabled={busy}>
                Einloggen
              </button>
            </form>
          </section>
        ) : (
          <div className="admin-grid">
            <section className="admin-panel">
              <div className="admin-create-row">
                <label className="field-block">
                  <span>Neues Projekt</span>
                  <input
                    value={newTitle}
                    onChange={(event) => setNewTitle(event.target.value)}
                    placeholder="Projektname"
                  />
                </label>
                <button type="button" className="primary-button" onClick={handleCreateProject} disabled={busy}>
                  Erstellen
                </button>
              </div>

              <div className="admin-project-list">
                {projects.map((project) => (
                  <article key={project.id} className="admin-project-card">
                    <button type="button" className="admin-project-title" onClick={() => setSelectedProjectId(project.id)}>
                      {project.title}
                    </button>

                    <div className="admin-project-meta">
                      <span>{project.hasVideo ? project.video?.originalName : 'Noch kein Upload'}</span>
                      <span>{project.commentCounts?.open ?? 0} offen</span>
                    </div>

                    <div className="admin-project-actions">
                      <button type="button" className="ghost-button" onClick={() => copyShareLink(project)}>
                        Link kopieren
                      </button>
                      <button type="button" className="ghost-button" onClick={() => window.open(project.sharePath, '_blank')}>
                        Kundenansicht
                      </button>
                      <label className="ghost-button upload-pill">
                        <span>Video hochladen</span>
                        <input type="file" accept="video/*" hidden onChange={(event) => handleUploadVideo(project.id, event.target.files?.[0])} />
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <aside className="admin-panel admin-panel--detail">
              {selectedProject?.hasVideo ? (
                <div className="admin-preview">
                  <video
                    ref={previewVideoRef}
                    controls
                    className="admin-preview__video"
                    src={`/api/share/${selectedProject.shareToken}/video`}
                  />
                </div>
              ) : null}

              <div className="admin-comments">
                {commentsBusy ? <p>Kommentare werden geladen...</p> : null}
                {comments.map((comment) => (
                  <button
                    key={comment.id}
                    type="button"
                    className={`admin-comment ${comment.status === 'resolved' ? 'is-resolved' : ''}`}
                    onClick={() => jumpPreviewTo(comment.timeSec)}
                  >
                    <div className="admin-comment__meta">
                      <span>{comment.authorName}</span>
                      <span>{formatTimecode(comment.timeSec || 0)}</span>
                    </div>
                    <p>{comment.text}</p>
                    <span className="admin-comment__status">{comment.status === 'resolved' ? 'Erledigt' : 'Offen'}</span>
                  </button>
                ))}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
```

Append the matching admin styles to `src/index.css`:

```css
.admin-page {
  min-height: 100%;
  color: var(--text-strong);
}

.admin-shell {
  width: min(1320px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 2rem 0 3rem;
}

.admin-topbar {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.admin-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.95fr);
}

.admin-panel {
  border: 1px solid var(--line-soft);
  border-radius: 28px;
  background: var(--bg-panel-strong);
  padding: 1.25rem;
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.22);
}

.admin-preview {
  overflow: hidden;
  border-radius: 22px;
  margin-bottom: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: #020611;
}

.admin-preview__video {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
}

.admin-create-row,
.admin-project-list,
.admin-comments,
.admin-login-form {
  display: grid;
  gap: 1rem;
}

.admin-project-card {
  border: 1px solid var(--line-soft);
  border-radius: 20px;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.04);
}

.admin-project-title {
  border: none;
  background: transparent;
  color: var(--text-strong);
  font: inherit;
  font-weight: 700;
  padding: 0;
  text-align: left;
}

.admin-project-meta,
.admin-project-actions,
.admin-comment__meta {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.admin-comment__status {
  color: var(--text-soft);
  font-size: 0.8rem;
}

.upload-pill {
  position: relative;
  overflow: hidden;
}

.admin-comment {
  width: 100%;
  text-align: left;
  border: 1px solid var(--line-soft);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-strong);
  padding: 0.9rem 1rem;
  margin-bottom: 0.75rem;
}

.admin-comment.is-resolved {
  opacity: 0.7;
}

.status-banner {
  margin: 1rem 0;
  padding: 0.85rem 1rem;
  border-radius: 16px;
  border: 1px solid var(--line-soft);
}

.status-banner--success {
  color: #dffcef;
  background: rgba(73, 211, 154, 0.12);
}

.status-banner--error {
  color: #ffe3dd;
  background: rgba(255, 107, 74, 0.14);
}

@media (max-width: 980px) {
  .admin-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Run the admin integration test and verify it passes**

Run:

```bash
npm run test -- src/AdminApp.test.jsx
```

Expected:

- PASS
- copy success text appears inline
- clicking a comment updates the preview video position

- [ ] **Step 5: Run a build smoke test**

Run:

```bash
npm run build
```

Expected:

- PASS
- no build regressions after the admin UI changes

- [ ] **Step 6: Commit**

```bash
git add src/AdminApp.jsx src/AdminApp.test.jsx src/index.css
git commit -m "feat: refresh admin review workspace"
```

## Task 5: Run End-to-End Verification and Deploy Safely

**Files:**
- Modify: none
- Test: local app, production build, live deployment smoke tests

- [ ] **Step 1: Run the focused frontend tests**

Run:

```bash
npm run test -- src/timeline.test.js src/components/ReviewTimeline.test.jsx src/ReviewApp.test.jsx src/AdminApp.test.jsx
```

Expected:

- PASS
- all targeted frontend behavior tests green

- [ ] **Step 2: Run the full build check**

Run:

```bash
npm run build
```

Expected:

- PASS
- production assets generated under `dist/`

- [ ] **Step 3: Do a local manual smoke test**

Run in terminal 1:

```bash
export ADMIN_PASSWORD='admin'
export SESSION_SECRET='local-dev-secret'
npm run dev:server
```

Run in terminal 2:

```bash
npm run dev
```

Manual checks:

- open `http://127.0.0.1:5173/`
- log into admin
- create a project
- upload a small sample video
- open the generated `/r/<token>` page
- click the timeline and submit a comment
- click the comment marker and confirm the video jumps
- click the comment in admin and confirm the preview jumps

- [ ] **Step 4: Deploy the updated frontend to Hetzner**

Run from the repo root:

```bash
rsync -az --delete \
  --exclude node_modules \
  --exclude data \
  --exclude dist \
  --exclude .playwright-cli \
  --exclude output \
  ./ root@5.9.106.75:/srv/video-editor/
```

Then on the server:

```bash
ssh root@5.9.106.75
cd /srv/video-editor
npm ci
npm run build
chown -R video-editor:video-editor /srv/video-editor
systemctl restart video-editor
systemctl status video-editor --no-pager
```

Expected:

- build succeeds on the server
- `video-editor.service` returns `active (running)`

- [ ] **Step 5: Run live smoke tests**

Run:

```bash
curl -sS https://video-editor.labpulse.ai/api/health
curl -I https://video-editor.labpulse.ai/
curl -I https://video-editor.labpulse.ai/api/admin/projects
```

Expected:

- `/api/health` returns `{"ok":true}`
- `/` returns `HTTP/2 200`
- `/api/admin/projects` returns `HTTP/2 401` when unauthenticated

Manual live checks:

- log into `https://video-editor.labpulse.ai`
- verify the customer layout feels upgraded
- verify the timeline is clickable
- verify comment markers appear
- verify admin copy-link feedback appears inline
- verify admin preview jumps to the clicked comment time
