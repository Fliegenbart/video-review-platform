import React, { useEffect, useRef, useState } from 'react';
import { apiRequest, formatTimecode } from './api.js';
import BrandLockup from './components/BrandLockup.jsx';
import ReviewTimeline from './components/ReviewTimeline.jsx';
import { loadReviewerName, saveReviewerName } from './reviewerSession.js';

function formatCommentDate(value) {
  if (!value) {
    return 'Just now';
  }

  return new Date(value).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function ReviewApp({ token }) {
  const videoRef = useRef(null);
  const [state, setState] = useState('loading');
  const [project, setProject] = useState(null);
  const [comments, setComments] = useState([]);
  const [error, setError] = useState(null);
  const [draftAuthorName, setDraftAuthorName] = useState('');
  const [storedReviewerName, setStoredReviewerName] = useState(() => loadReviewerName());
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [selectedTimeSec, setSelectedTimeSec] = useState(null);
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);

  const videoSrc = token ? `/api/share/${token}/video` : null;
  const activeTimeSec = selectedTimeSec ?? currentTimeSec;
  const hasStoredReviewerName = Boolean(storedReviewerName.trim());
  const effectiveReviewerName = hasStoredReviewerName
    ? storedReviewerName.trim()
    : draftAuthorName.trim();

  async function refresh() {
    const p = await apiRequest(`/api/share/${token}`);
    const c = await apiRequest(`/api/share/${token}/comments`);
    setProject(p.project);
    setComments(c.comments || []);
  }

  function seekVideo(timeSec) {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.currentTime = Math.max(0, Number(timeSec) || 0);
    setCurrentTimeSec(video.currentTime || 0);
  }

  function syncVideoTime(event) {
    const video = event.currentTarget;
    setCurrentTimeSec(video.currentTime || 0);
  }

  function syncVideoMetadata(event) {
    const video = event.currentTarget;
    setDurationSec(video.duration || 0);
    setCurrentTimeSec(video.currentTime || 0);
  }

  function openComposerAt(timeSec) {
    setError(null);
    setActiveCommentId(null);
    setSelectedTimeSec(timeSec);
    setComposerOpen(true);
  }

  function closeComposer() {
    setError(null);
    setComposerOpen(false);
    setText('');
    setSelectedTimeSec(null);
  }

  function getFreshCommentTime() {
    return videoRef.current?.currentTime ?? currentTimeSec;
  }

  function handleSelectTime(timeSec) {
    seekVideo(timeSec);
    openComposerAt(timeSec);
  }

  function handleJumpToComment(comment) {
    if (!comment) {
      return;
    }

    const timeSec = Number(comment.timeSec) || 0;
    setActiveCommentId(comment.id);
    setSelectedTimeSec(timeSec);
    seekVideo(timeSec);
    videoRef.current?.play?.().catch(() => {});
  }

  async function submitComment() {
    const cleanText = text.trim();
    const cleanAuthorName = effectiveReviewerName;
    if (!cleanText || !cleanAuthorName) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await apiRequest(`/api/share/${token}/comments`, {
        method: 'POST',
        json: {
          authorName: cleanAuthorName,
          text: cleanText,
          timeSec: activeTimeSec,
        },
      });

      if (!hasStoredReviewerName) {
        saveReviewerName(cleanAuthorName);
        setStoredReviewerName(cleanAuthorName);
        setDraftAuthorName('');
      }

      setText('');
      setComposerOpen(false);
      setSelectedTimeSec(null);
      setActiveCommentId(null);
      await refresh();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function deleteComment(comment) {
    if (!comment?.id) {
      return;
    }

    if (!window.confirm('Delete this comment?')) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await apiRequest(`/api/share/${token}/comments/${comment.id}`, {
        method: 'DELETE',
      });

      if (activeCommentId === comment.id) {
        setActiveCommentId(null);
        setSelectedTimeSec(null);
      }

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
      setProject(null);
      setComments([]);
      setError(new Error('Missing token'));
      return;
    }

    let cancelled = false;

    setState('loading');
    setError(null);
    setProject(null);
    setComments([]);
    setSelectedTimeSec(null);
    setActiveCommentId(null);
    setComposerOpen(false);
    setDurationSec(0);
    setCurrentTimeSec(0);

    refresh()
      .then(() => {
        if (cancelled) {
          return;
        }

        setState('ready');
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }

        setError(err);
        setState('error');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = project?.title
      ? `${project.title} · OBSIDIAN`
      : 'OBSIDIAN - Collaborative editing made easy';
  }, [project?.title]);

  const sortedComments = comments
    .slice()
    .sort((a, b) => (Number(a.timeSec) || 0) - (Number(b.timeSec) || 0));

  return (
    <div className="review-page">
      <div className="review-page__glow" />

      <div className="review-shell">
        <header className="review-hero">
          <div>
            <BrandLockup />
            <div className="eyebrow">Secure review link</div>
            <h1>{project?.title || 'Video Review'}</h1>
            <p>Watch the cut, leave precise notes, and stay focused on the frame.</p>
          </div>
        </header>

        {state === 'loading' ? <p className="review-feedback">Loading review…</p> : null}

        {state === 'error' ? (
          <div className="review-feedback review-feedback--error">
            This review link is invalid or no longer available.
          </div>
        ) : null}

        {state === 'ready' ? (
          <main className="review-grid">
            <section className="review-stage__panel">
              <div className="review-stage__header">
                <div>
                  <div className="eyebrow">Private review</div>
                  <h2>{project?.title || 'Untitled review'}</h2>
                </div>
                <div className="timestamp-pill">{formatTimecode(activeTimeSec)}</div>
              </div>

              {project?.hasVideo ? (
                <>
                  <div className="review-video-frame">
                    <video
                      ref={videoRef}
                      controls
                      className="review-video"
                      src={videoSrc}
                      onLoadedMetadata={syncVideoMetadata}
                      onDurationChange={syncVideoMetadata}
                      onTimeUpdate={syncVideoTime}
                      onSeeking={syncVideoTime}
                      onSeeked={syncVideoTime}
                    />
                  </div>

                  <ReviewTimeline
                    duration={durationSec}
                    currentTime={currentTimeSec}
                    selectedTimeSec={selectedTimeSec}
                    comments={sortedComments}
                    onSeek={seekVideo}
                    onSelectTime={handleSelectTime}
                    onJumpToComment={handleJumpToComment}
                  />
                </>
              ) : (
                <div className="review-feedback">
                  No video has been uploaded for this review yet.
                </div>
              )}

            </section>

            <aside className="review-sidebar">
              <div className="review-sidebar__action">
                <div className="review-sidebar__eyebrow">Feedback</div>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => openComposerAt(getFreshCommentTime())}
                  disabled={!project?.hasVideo}
                >
                  Add comment
                </button>
                <p>Pause anywhere or click the timeline to leave a note at that exact moment.</p>
              </div>

              {error && !composerOpen ? (
                <div className="review-feedback review-feedback--error">
                  That action could not be completed. Please try again.
                </div>
              ) : null}

              {composerOpen ? (
                <section className="review-composer">
                  <div>
                    <h3>New comment</h3>
                    <p>{`Comment at ${formatTimecode(activeTimeSec)}`}</p>
                  </div>

                  {!hasStoredReviewerName ? (
                    <div className="field-block">
                      <label htmlFor="review-author">Your name</label>
                      <input
                        id="review-author"
                        type="text"
                        value={draftAuthorName}
                        onChange={(event) => setDraftAuthorName(event.target.value)}
                        placeholder="Anna"
                      />
                    </div>
                  ) : null}

                  <div className="field-block">
                    <label htmlFor="review-text">Comment</label>
                    <textarea
                      id="review-text"
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      placeholder="What should change?"
                      rows={5}
                    />
                  </div>

                  <div className="review-composer__footer">
                    <button type="button" className="ghost-button" onClick={closeComposer}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={submitComment}
                      disabled={busy || !project?.hasVideo || !text.trim() || !effectiveReviewerName}
                    >
                      Send comment
                    </button>
                  </div>

                  {error ? (
                    <div className="review-feedback review-feedback--error">
                      Unable to send your comment. Please try again.
                    </div>
                  ) : null}
                </section>
              ) : null}

              <div className="review-sidebar__header">
                <h3>Comments ({sortedComments.length})</h3>
                <p>Click any note to jump straight to the matching point in the video.</p>
              </div>

              {sortedComments.length === 0 ? (
                <div className="review-feedback review-feedback--empty">
                  <strong>No feedback yet.</strong>
                  <span>Click "Add comment" to start.</span>
                </div>
              ) : (
                <div className="review-comment-list">
                  {sortedComments.map((comment) => {
                    const isActive = activeCommentId === comment.id;
                    const isResolved = comment.status === 'resolved';

                    return (
                      <article
                        key={comment.id}
                        className={[
                          'review-comment',
                          isActive ? 'review-comment--active' : '',
                          isResolved ? 'review-comment--resolved' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <button
                          type="button"
                          className="review-comment__jump"
                          onClick={() => handleJumpToComment(comment)}
                        >
                          <div className="review-comment__meta">
                            <span>{comment.authorName || 'Client'}</span>
                            <span>{formatTimecode(comment.timeSec || 0)}</span>
                          </div>

                          <div className="review-comment__meta">
                            <span>{formatCommentDate(comment.createdAt)}</span>
                            <span>{isResolved ? 'Resolved' : 'Open'}</span>
                          </div>

                          <p>{comment.text}</p>
                        </button>

                        <div className="review-comment__footer">
                          <span className="review-comment__label">
                            {isResolved ? 'Resolved' : 'Marked on the timeline'}
                          </span>
                          <button
                            type="button"
                            className="ghost-button review-comment__delete"
                            onClick={() => deleteComment(comment)}
                            disabled={busy}
                            aria-label="Delete comment"
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </aside>
          </main>
        ) : null}
      </div>
    </div>
  );
}
