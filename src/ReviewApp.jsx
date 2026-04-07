import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest, formatTimecode } from './api.js';

function Button({ children, ...props }) {
  return (
    <button
      {...props}
      className={[
        'inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition',
        'bg-slate-900 text-white hover:bg-slate-800',
        'disabled:opacity-50 disabled:hover:bg-slate-900',
        props.className || '',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function Input({ ...props }) {
  return (
    <input
      {...props}
      className={[
        'w-full rounded-md bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200',
        'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900',
        props.className || '',
      ].join(' ')}
    />
  );
}

function Textarea({ ...props }) {
  return (
    <textarea
      {...props}
      className={[
        'w-full rounded-md bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200',
        'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900',
        props.className || '',
      ].join(' ')}
    />
  );
}

function Card({ children }) {
  return <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">{children}</div>;
}

export default function ReviewApp({ token }) {
  const videoRef = useRef(null);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [project, setProject] = useState(null);
  const [comments, setComments] = useState([]);
  const [error, setError] = useState(null);

  const [authorName, setAuthorName] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const videoSrc = useMemo(() => (token ? `/api/share/${token}/video` : null), [token]);

  async function refresh() {
    const p = await apiRequest(`/api/share/${token}`);
    const c = await apiRequest(`/api/share/${token}/comments`);
    setProject(p.project);
    setComments(c.comments || []);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function submitComment() {
    const video = videoRef.current;
    const timeSec = video ? video.currentTime : 0;
    const cleanText = text.trim();
    if (!cleanText) return;

    setBusy(true);
    setError(null);
    try {
      await apiRequest(`/api/share/${token}/comments`, {
        method: 'POST',
        json: { authorName: authorName.trim(), text: cleanText, timeSec },
      });
      setText('');
      await refresh();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Video Review</h1>
            <p className="text-sm text-slate-600">
              Du kannst Kommentare direkt mit Zeitstempel im Video hinterlassen.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a className="text-sm text-slate-600 hover:underline" href="/">
              Admin
            </a>
          </div>
        </div>

        {state === 'loading' ? (
          <p className="mt-6 text-sm text-slate-600">Lade…</p>
        ) : null}

        {state === 'error' ? (
          <div className="mt-6 rounded-lg bg-rose-50 p-3 text-sm text-rose-900 ring-1 ring-rose-200">
            Link ungültig oder Projekt nicht gefunden.
          </div>
        ) : null}

        {state === 'ready' ? (
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <div className="flex flex-col gap-1">
                  <div className="text-xs text-slate-500">Projekt</div>
                  <div className="text-lg font-semibold">{project?.title}</div>
                </div>

                {project?.hasVideo ? (
                  <div className="mt-4 overflow-hidden rounded-lg bg-black">
                    <video ref={videoRef} controls className="h-auto w-full" src={videoSrc} />
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200">
                    Für dieses Projekt wurde noch kein Video hochgeladen.
                  </div>
                )}
              </Card>

              <Card>
                <h2 className="text-base font-semibold">Kommentar hinzufügen</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Spiel das Video ab und drücke dann auf “Kommentar senden”. Der Zeitstempel wird automatisch
                  übernommen.
                </p>

                <div className="mt-4 grid gap-3">
                  <div>
                    <label className="text-sm font-medium">Dein Name (optional)</label>
                    <Input
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="z.B. Max Mustermann"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Kommentar</label>
                    <Textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Was soll geändert werden?"
                      rows={4}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-500">
                      Aktuelle Zeit:{' '}
                      {videoRef.current ? formatTimecode(videoRef.current.currentTime || 0) : '00:00:00'}
                    </div>
                    <Button type="button" onClick={submitComment} disabled={busy || !project?.hasVideo}>
                      Kommentar senden
                    </Button>
                  </div>
                </div>

                {error ? (
                  <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-900 ring-1 ring-rose-200">
                    Fehler beim Senden. Bitte nochmal versuchen.
                  </div>
                ) : null}
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <h2 className="text-base font-semibold">Kommentare ({comments.length})</h2>
                {comments.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">Noch keine Kommentare.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {comments
                      .slice()
                      .sort((a, b) => (a.timeSec || 0) - (b.timeSec || 0))
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            if (!videoRef.current) return;
                            videoRef.current.currentTime = Number(c.timeSec) || 0;
                            videoRef.current.play().catch(() => {});
                          }}
                          className={[
                            'w-full rounded-lg p-3 text-left ring-1 transition',
                            c.status === 'resolved'
                              ? 'bg-slate-50 ring-slate-200 hover:bg-slate-100'
                              : 'bg-white ring-slate-200 hover:bg-slate-50',
                          ].join(' ')}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-xs text-slate-500">
                                {c.authorName || 'Kunde'} · {new Date(c.createdAt).toLocaleString()}
                              </div>
                              <div className="mt-1 text-sm font-semibold">{formatTimecode(c.timeSec || 0)}</div>
                            </div>
                            <div className="text-xs text-slate-500">
                              {c.status === 'resolved' ? 'Erledigt' : 'Offen'}
                            </div>
                          </div>
                          <p className="mt-2 text-sm text-slate-800">{c.text}</p>
                        </button>
                      ))}
                  </div>
                )}
              </Card>

              <Card>
                <h2 className="text-base font-semibold">Tipp</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Klick auf einen Kommentar, um im Video direkt zu dieser Stelle zu springen.
                </p>
              </Card>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

