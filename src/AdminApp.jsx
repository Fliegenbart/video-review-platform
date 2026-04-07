import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from './api.js';

function buildShareUrl(sharePath) {
  if (typeof window === 'undefined') return sharePath;
  return `${window.location.origin}${sharePath}`;
}

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

function SecondaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      className={[
        'inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition',
        'bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50',
        'disabled:opacity-50',
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

function Card({ children }) {
  return <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">{children}</div>;
}

export default function AdminApp() {
  const [authState, setAuthState] = useState('checking'); // checking | signed_out | signed_in
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);

  const [password, setPassword] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const [comments, setComments] = useState([]);
  const [commentsBusy, setCommentsBusy] = useState(false);

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
      })
      .finally(() => {
        // no-op
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setComments([]);
      return;
    }
    setCommentsBusy(true);
    apiRequest(`/api/admin/projects/${selectedProjectId}/comments`)
      .then((data) => setComments(data.comments || []))
      .catch((err) => setError(err))
      .finally(() => setCommentsBusy(false));
  }, [selectedProjectId]);

  async function handleSignIn(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiRequest('/api/admin/session', { method: 'POST', json: { password } });
      setPassword('');
      await refreshProjects();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    setError(null);
    try {
      await apiRequest('/api/admin/session', { method: 'DELETE' });
      setProjects([]);
      setSelectedProjectId(null);
      setAuthState('signed_out');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateProject(e) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setBusy(true);
    setError(null);
    try {
      await apiRequest('/api/admin/projects', { method: 'POST', json: { title } });
      setNewTitle('');
      await refreshProjects();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleUploadVideo(projectId, file) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('video', file);
      await apiRequest(`/api/admin/projects/${projectId}/video`, { method: 'POST', body: form });
      await refreshProjects();
      if (selectedProjectId === projectId) {
        const data = await apiRequest(`/api/admin/projects/${projectId}/comments`);
        setComments(data.comments || []);
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function setCommentStatus(projectId, commentId, status) {
    setCommentsBusy(true);
    setError(null);
    try {
      await apiRequest(`/api/admin/projects/${projectId}/comments/${commentId}/status`, {
        method: 'POST',
        json: { status },
      });
      const data = await apiRequest(`/api/admin/projects/${projectId}/comments`);
      setComments(data.comments || []);
      await refreshProjects();
    } catch (err) {
      setError(err);
    } finally {
      setCommentsBusy(false);
    }
  }

  const friendlyError = useMemo(() => {
    if (!error) return null;
    if (error?.status === 401) return 'Login fehlgeschlagen (falsches Passwort).';
    const details = error?.payload?.details || error?.payload?.error || '';
    return `Fehler: ${details || 'Unbekannt'}`;
  }, [error]);

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Video Editor (Admin)</h1>
            <p className="text-sm text-slate-600">
              Videos hochladen, Link kopieren, Kunden kommentieren lassen.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SecondaryButton
              type="button"
              onClick={() => window.open('https://video-editor.labpulse.ai', '_blank')}
            >
              Live URL
            </SecondaryButton>
            {authState === 'signed_in' ? (
              <SecondaryButton type="button" onClick={handleSignOut} disabled={busy}>
                Logout
              </SecondaryButton>
            ) : null}
          </div>
        </div>

        {friendlyError ? (
          <div className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-900 ring-1 ring-rose-200">
            {friendlyError}
          </div>
        ) : null}

        {authState !== 'signed_in' ? (
          <div className="mt-8 max-w-md">
            <Card>
              <h2 className="text-base font-semibold">Admin Login</h2>
              <p className="mt-1 text-sm text-slate-600">
                Nur du hast Zugang. Kunden brauchen keinen Login.
              </p>
              <form className="mt-4 space-y-3" onSubmit={handleSignIn}>
                <div>
                  <label className="text-sm font-medium">Passwort</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="ADMIN_PASSWORD"
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" disabled={busy}>
                  Einloggen
                </Button>
              </form>
            </Card>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <h2 className="text-base font-semibold">Neues Projekt</h2>
                <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={handleCreateProject}>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Projektname (z.B. Produktvideo April)"
                  />
                  <Button type="submit" disabled={busy}>
                    Erstellen
                  </Button>
                </form>
              </Card>

              <Card>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold">Projekte</h2>
                  <SecondaryButton type="button" onClick={() => refreshProjects()} disabled={busy}>
                    Aktualisieren
                  </SecondaryButton>
                </div>
                <div className="mt-3 divide-y divide-slate-100">
                  {projects.length === 0 ? (
                    <p className="py-6 text-sm text-slate-600">Noch keine Projekte.</p>
                  ) : null}
                  {projects.map((p) => (
                    <div key={p.id} className="py-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <button
                            type="button"
                            onClick={() => setSelectedProjectId(p.id)}
                            className={[
                              'text-left text-sm font-semibold hover:underline',
                              selectedProjectId === p.id ? 'text-slate-900' : 'text-slate-800',
                            ].join(' ')}
                          >
                            {p.title}
                          </button>
                          <div className="mt-1 text-xs text-slate-500">
                            Kommentare: {p.commentCounts?.open ?? 0} offen / {p.commentCounts?.total ?? 0}{' '}
                            total
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <SecondaryButton
                            type="button"
                            onClick={async () => {
                              const url = buildShareUrl(p.sharePath);
                              await navigator.clipboard.writeText(url);
                              alert('Link kopiert');
                            }}
                          >
                            Link kopieren
                          </SecondaryButton>
                          <SecondaryButton type="button" onClick={() => window.open(p.sharePath, '_blank')}>
                            Kundenansicht
                          </SecondaryButton>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs text-slate-600">
                          Video: {p.hasVideo ? p.video?.originalName : 'Noch kein Upload'}
                        </div>
                        <label className="text-xs">
                          <span className="sr-only">Video hochladen</span>
                          <input
                            type="file"
                            accept="video/*"
                            disabled={busy}
                            onChange={(e) => handleUploadVideo(p.id, e.target.files?.[0])}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <h2 className="text-base font-semibold">Kommentare</h2>
                {!selectedProject ? (
                  <p className="mt-2 text-sm text-slate-600">Wähle links ein Projekt aus.</p>
                ) : (
                  <>
                    <div className="mt-1 text-xs text-slate-600">{selectedProject.title}</div>
                    {commentsBusy ? (
                      <p className="mt-3 text-sm text-slate-600">Lade Kommentare…</p>
                    ) : comments.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-600">Noch keine Kommentare.</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {comments
                          .slice()
                          .sort((a, b) => (a.timeSec || 0) - (b.timeSec || 0))
                          .map((c) => (
                            <div
                              key={c.id}
                              className={[
                                'rounded-lg p-3 ring-1',
                                c.status === 'resolved'
                                  ? 'bg-slate-50 ring-slate-200'
                                  : 'bg-white ring-slate-200',
                              ].join(' ')}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="text-xs text-slate-500">
                                    {c.authorName} · {new Date(c.createdAt).toLocaleString()}
                                  </div>
                                  <div className="mt-1 text-sm font-medium">
                                    {String(c.timeSec ?? 0).includes('.')
                                      ? Number(c.timeSec).toFixed(1)
                                      : c.timeSec}{' '}
                                    s
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {c.status !== 'resolved' ? (
                                    <SecondaryButton
                                      type="button"
                                      onClick={() => setCommentStatus(selectedProject.id, c.id, 'resolved')}
                                    >
                                      Erledigt
                                    </SecondaryButton>
                                  ) : (
                                    <SecondaryButton
                                      type="button"
                                      onClick={() => setCommentStatus(selectedProject.id, c.id, 'open')}
                                    >
                                      Wieder offen
                                    </SecondaryButton>
                                  )}
                                </div>
                              </div>
                              <p className="mt-2 text-sm text-slate-800">{c.text}</p>
                            </div>
                          ))}
                      </div>
                    )}
                  </>
                )}
              </Card>

              <Card>
                <h2 className="text-base font-semibold">Sicherheit</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Der Kundenlink ist geheim. Wer den Link kennt, kann kommentieren. Teile ihn nur an die
                  richtigen Personen.
                </p>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

