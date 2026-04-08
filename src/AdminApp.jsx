import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest, formatTimecode, uploadRequest } from './api.js';
import BrandLockup from './components/BrandLockup.jsx';

function buildShareUrl(sharePath) {
  if (typeof window === 'undefined') return sharePath;
  return `${window.location.origin}${sharePath}`;
}

function Button({ children, className = '', ...props }) {
  return (
    <button {...props} className={`admin-btn admin-btn--primary ${className}`.trim()}>
      {children}
    </button>
  );
}

function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button {...props} className={`admin-btn admin-btn--secondary ${className}`.trim()}>
      {children}
    </button>
  );
}

function Input({ className = '', ...props }) {
  return <input {...props} className={`admin-input ${className}`.trim()} />;
}

export default function AdminApp() {
  const [authState, setAuthState] = useState('checking'); // checking | signed_out | signed_in
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);
  const [flashMessage, setFlashMessage] = useState(null);

  const [password, setPassword] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const [comments, setComments] = useState([]);
  const [commentsBusy, setCommentsBusy] = useState(false);
  const [uploadProgressByProject, setUploadProgressByProject] = useState({});
  const previewVideoRef = useRef(null);

  async function refreshComments(projectId) {
    if (!projectId) {
      setComments([]);
      return;
    }

    const data = await apiRequest(`/api/admin/projects/${projectId}/comments`);
    setComments(data.comments || []);
  }

  async function refreshProjects() {
    const data = await apiRequest('/api/admin/projects');
    const nextProjects = data.projects || [];
    setProjects(nextProjects);
    setSelectedProjectId((current) =>
      current && nextProjects.some((project) => project.id === current) ? current : null
    );
    setAuthState('signed_in');
  }

  useEffect(() => {
    refreshProjects().catch((err) => {
      if (err?.status === 401) {
        setAuthState('signed_out');
        return;
      }
      setError(err);
      setAuthState('signed_out');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setComments([]);
      return;
    }

    setCommentsBusy(true);
    refreshComments(selectedProjectId)
      .catch((err) => setError(err))
      .finally(() => setCommentsBusy(false));
  }, [selectedProjectId]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = 'OBSIDIAN - Collaborative editing made easy';
  }, []);

  async function handleSignIn(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFlashMessage(null);

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
    setFlashMessage(null);

    try {
      await apiRequest('/api/admin/session', { method: 'DELETE' });
      setProjects([]);
      setSelectedProjectId(null);
      setComments([]);
      setAuthState('signed_out');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateProject(event) {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) return;

    setBusy(true);
    setError(null);
    setFlashMessage(null);

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
    setFlashMessage(null);
    setUploadProgressByProject((current) => ({ ...current, [projectId]: 0 }));

    try {
      const form = new FormData();
      form.append('video', file);
      await uploadRequest(`/api/admin/projects/${projectId}/video`, {
        method: 'POST',
        body: form,
        onProgress: (percent) => {
          setUploadProgressByProject((current) => {
            if (current[projectId] === percent) return current;
            return { ...current, [projectId]: percent };
          });
        },
      });
      await refreshProjects();
      setFlashMessage({ type: 'success', text: 'Video uploaded successfully' });

      if (selectedProjectId === projectId) {
        await refreshComments(projectId);
      }
    } catch (err) {
      setError(err);
    } finally {
      setUploadProgressByProject((current) => {
        const next = { ...current };
        delete next[projectId];
        return next;
      });
      setBusy(false);
    }
  }

  async function setCommentStatus(projectId, commentId, status) {
    setCommentsBusy(true);
    setError(null);
    setFlashMessage(null);

    try {
      await apiRequest(`/api/admin/projects/${projectId}/comments/${commentId}/status`, {
        method: 'POST',
        json: { status },
      });
      await refreshComments(projectId);
      await refreshProjects();
    } catch (err) {
      setError(err);
    } finally {
      setCommentsBusy(false);
    }
  }

  async function deleteComment(projectId, commentId) {
    if (!window.confirm('Delete this comment?')) {
      return;
    }

    setCommentsBusy(true);
    setError(null);
    setFlashMessage(null);

    try {
      await apiRequest(`/api/admin/projects/${projectId}/comments/${commentId}`, {
        method: 'DELETE',
      });
      await refreshComments(projectId);
      await refreshProjects();
    } catch (err) {
      setError(err);
    } finally {
      setCommentsBusy(false);
    }
  }

  async function copyShareLink(project) {
    setFlashMessage(null);

    try {
      await navigator.clipboard.writeText(buildShareUrl(project.sharePath));
      setFlashMessage({ type: 'success', text: 'Link copied' });
    } catch (err) {
      setFlashMessage({ type: 'error', text: 'Unable to copy link' });
    }
  }

  async function deleteProject(project) {
    if (!project?.id) {
      return;
    }

    if (
      !window.confirm(
        `Delete project "${project.title}"? This will permanently remove the video and all comments.`
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    setFlashMessage(null);

    try {
      await apiRequest(`/api/admin/projects/${project.id}`, {
        method: 'DELETE',
      });

      if (selectedProjectId === project.id) {
        setSelectedProjectId(null);
        setComments([]);
      }

      await refreshProjects();
      setFlashMessage({ type: 'success', text: 'Project deleted' });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  function jumpPreviewTo(timeSec) {
    const previewVideo = previewVideoRef.current;
    if (!previewVideo) return;

    previewVideo.currentTime = Math.max(0, Number(timeSec) || 0);
    const playResult = previewVideo.play?.();
    if (playResult?.catch) {
      playResult.catch(() => {});
    }
  }

  const friendlyError = useMemo(() => {
    if (!error) return null;
    if (error?.status === 401) return 'Sign-in failed. Please check the password.';
    const details = error?.payload?.details || error?.payload?.error || '';
    return `Error: ${details || 'Unknown issue'}`;
  }, [error]);

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <header className="admin-topbar">
          <div>
            <BrandLockup />
            <div className="eyebrow">Admin studio</div>
            <h1>Review Studio</h1>
            <p>
              Manage private review links, upload cuts, and clear notes without dashboard noise.
            </p>
          </div>

          <div className="admin-topbar__actions">
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
        </header>

        {flashMessage ? (
          <div
            className={`status-banner ${
              flashMessage.type === 'error' ? 'status-banner--error' : 'status-banner--success'
            }`}
          >
            {flashMessage.text}
          </div>
        ) : null}

        {friendlyError ? (
          <div className="status-banner status-banner--error">{friendlyError}</div>
        ) : null}

        {authState !== 'signed_in' ? (
          <section className="admin-panel admin-login-card">
            <h2>Admin sign in</h2>
            <p>Only your team needs access here. Clients open the secure review link directly.</p>
            <form className="admin-login-form" onSubmit={handleSignIn}>
              <label className="admin-field">
                <span>Password</span>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="ADMIN_PASSWORD"
                  autoComplete="current-password"
                />
              </label>
              <Button type="submit" disabled={busy}>
                Sign in
              </Button>
            </form>
          </section>
        ) : (
          <div className="admin-grid">
            <section className="admin-panel">
              <div className="admin-create-row">
                <div>
                  <div className="admin-section-label">New project</div>
                  <h2>Create review</h2>
                </div>

                <form className="admin-create-form" onSubmit={handleCreateProject}>
                  <Input
                    value={newTitle}
                    onChange={(event) => setNewTitle(event.target.value)}
                    placeholder="Project title"
                  />
                  <Button type="submit" disabled={busy}>
                    Create
                  </Button>
                </form>
              </div>

              <div className="admin-list-header">
                <div>
                  <h3>Projects</h3>
                  <p>Select a project to open the preview, share link, and comment workflow.</p>
                </div>
                <SecondaryButton type="button" onClick={() => refreshProjects()} disabled={busy}>
                  Refresh
                </SecondaryButton>
              </div>

              <div className="admin-project-list">
                {projects.length === 0 ? <p className="admin-empty">No projects yet.</p> : null}

                {projects.map((project) => {
                  const isSelected = selectedProjectId === project.id;
                  const openCount = project.commentCounts?.open ?? 0;
                  const totalCount = project.commentCounts?.total ?? 0;
                  const uploadProgress = uploadProgressByProject[project.id];
                  const isUploading = uploadProgress !== undefined;

                  return (
                    <article
                      key={project.id}
                      className={`admin-project-card ${isSelected ? 'is-selected' : ''}`}
                    >
                      <div className="admin-project-card__header">
                        <div>
                          <button
                            type="button"
                            className="admin-project-title"
                            onClick={() => setSelectedProjectId(project.id)}
                          >
                            {project.title}
                          </button>
                          <div className="admin-project-meta">
                            <span>{project.hasVideo ? 'Video ready' : 'No video yet'}</span>
                            <span>{project.video?.originalName || 'Waiting for upload'}</span>
                          </div>
                        </div>
                        <div className="admin-project-badge">
                          {openCount} open / {totalCount} total
                        </div>
                      </div>

                      <div className="admin-project-actions">
                        <SecondaryButton type="button" onClick={() => copyShareLink(project)}>
                          Copy link
                        </SecondaryButton>
                        <SecondaryButton
                          type="button"
                          onClick={() => window.open(project.sharePath, '_blank')}
                        >
                          Open review
                        </SecondaryButton>
                        <label className="admin-upload-button">
                          <span>Upload video</span>
                          <input
                            type="file"
                            accept="video/*"
                            disabled={busy}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              event.target.value = '';
                              handleUploadVideo(project.id, file);
                            }}
                          />
                        </label>
                        <SecondaryButton
                          type="button"
                          onClick={() => deleteProject(project)}
                          disabled={busy || isUploading}
                          aria-label="Delete project"
                        >
                          Delete project
                        </SecondaryButton>
                      </div>

                      {isUploading ? (
                        <div className="admin-upload-progress">
                          <div className="admin-upload-progress__meta">
                            <span>Upload in progress</span>
                            <span>{uploadProgress} %</span>
                          </div>
                          <div
                            className="admin-upload-progress__track"
                            role="progressbar"
                            aria-label="Upload progress"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={uploadProgress}
                          >
                            <div
                              className="admin-upload-progress__fill"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="admin-panel">
              <div className="admin-detail-header">
                <div className="admin-section-label">Project workspace</div>
                <h2>{selectedProject ? selectedProject.title : 'Review detail'}</h2>
                <p>
                  {selectedProject
                    ? 'Click a comment to jump the preview player to the exact point in the cut.'
                    : 'Select a project on the left to load the preview and comment rail.'}
                </p>
              </div>

              {selectedProject ? (
                <>
                  {selectedProject.hasVideo ? (
                    <div className="admin-preview">
                      <video
                        ref={previewVideoRef}
                        className="admin-preview__video"
                        src={`/api/share/${selectedProject.shareToken}/video`}
                        controls
                        playsInline
                        preload="metadata"
                      />
                    </div>
                  ) : (
                    <div className="admin-preview admin-preview--empty">
                      <p>No video uploaded for this project yet.</p>
                    </div>
                  )}

                  <div className="admin-comments">
                    <div className="admin-comments__header">
                      <h3>Comments</h3>
                      <p>
                        {commentsBusy
                          ? 'Loading comments...'
                          : `${comments.length} notes for this project.`}
                      </p>
                    </div>

                    {!commentsBusy && comments.length === 0 ? (
                      <p className="admin-empty">No comments yet.</p>
                    ) : null}

                    {!commentsBusy
                      ? comments
                          .slice()
                          .sort((a, b) => (a.timeSec || 0) - (b.timeSec || 0))
                          .map((comment) => (
                            <div key={comment.id} className="admin-comment-row">
                              <button
                                type="button"
                                className="admin-comment"
                                onClick={() => jumpPreviewTo(comment.timeSec)}
                              >
                                <div className="admin-comment__meta">
                                  <span>{comment.authorName}</span>
                                  <span>{formatTimecode(comment.timeSec)}</span>
                                </div>
                                <p>{comment.text}</p>
                              </button>

                              <div className="admin-comment__footer">
                                <span
                                  className={`admin-comment__status ${
                                    comment.status === 'resolved'
                                      ? 'admin-comment__status--resolved'
                                      : 'admin-comment__status--open'
                                  }`}
                                >
                                {comment.status === 'resolved' ? 'Resolved' : 'Open'}
                                </span>
                                <div className="admin-comment__actions">
                                  {comment.status !== 'resolved' ? (
                                    <SecondaryButton
                                      type="button"
                                      onClick={() =>
                                        setCommentStatus(selectedProject.id, comment.id, 'resolved')
                                      }
                                      disabled={commentsBusy}
                                    >
                                      Resolve
                                    </SecondaryButton>
                                  ) : (
                                    <SecondaryButton
                                      type="button"
                                      onClick={() =>
                                        setCommentStatus(selectedProject.id, comment.id, 'open')
                                      }
                                      disabled={commentsBusy}
                                    >
                                      Reopen
                                    </SecondaryButton>
                                  )}

                                  <SecondaryButton
                                    type="button"
                                    onClick={() => deleteComment(selectedProject.id, comment.id)}
                                    disabled={commentsBusy}
                                    aria-label="Delete comment"
                                  >
                                    Delete
                                  </SecondaryButton>
                                </div>
                              </div>
                            </div>
                          ))
                      : null}
                  </div>
                </>
              ) : (
                <div className="admin-preview admin-preview--empty">
                  <p>Select a project to bring the preview and feedback stream into focus.</p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
