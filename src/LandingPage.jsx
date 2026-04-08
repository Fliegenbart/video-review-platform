import React, { useEffect, useMemo, useRef, useState } from 'react';
import { formatTimecode } from './api.js';
import BrandLockup from './components/BrandLockup.jsx';
import ReviewTimeline from './components/ReviewTimeline.jsx';
import {
  demoReviewComments,
  demoReviewProject,
  demoReviewVideoSrc,
} from './demoReviewData.js';

export default function LandingPage() {
  const videoRef = useRef(null);
  const [durationSec, setDurationSec] = useState(demoReviewProject.durationSec);
  const [selectedCommentId, setSelectedCommentId] = useState(demoReviewComments[0]?.id ?? null);
  const [selectedTimeSec, setSelectedTimeSec] = useState(demoReviewComments[0]?.timeSec ?? 0);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = 'OBSIDIAN - Collaborative editing made easy';
  }, []);

  const selectedComment = useMemo(
    () => demoReviewComments.find((comment) => comment.id === selectedCommentId) ?? demoReviewComments[0],
    [selectedCommentId]
  );

  function seekPreview(timeSec) {
    const nextTime = Math.max(0, Number(timeSec) || 0);
    const video = videoRef.current;

    if (video) {
      video.currentTime = nextTime;
    }

    setSelectedTimeSec(nextTime);
  }

  function handleJumpToComment(comment) {
    if (!comment) {
      return;
    }

    setSelectedCommentId(comment.id);
    setSelectedTimeSec(comment.timeSec);
    seekPreview(comment.timeSec);
  }

  function handleSelectTime(timeSec) {
    setSelectedCommentId(null);
    seekPreview(timeSec);
  }

  function syncPreviewMetadata(event) {
    const video = event.currentTarget;
    setDurationSec(video.duration || demoReviewProject.durationSec);
  }

  return (
    <div className="landing-page">
      <div className="landing-page__glow" />

      <header className="landing-nav">
        <BrandLockup />

        <div className="landing-nav__actions">
          <a className="ghost-button landing-nav__link" href="/admin">
            Studio admin
          </a>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-hero__copy">
            <div className="landing-kicker">Private video review</div>
            <h1>Private video review, without the software feeling.</h1>

            <div className="landing-actions">
              <a className="primary-button landing-button" href="/demo">
                Open secure review
              </a>
              <a className="ghost-button landing-button" href="/admin">
                Admin sign in
              </a>
            </div>
          </div>

          <div className="landing-stage">
            <div className="landing-stage__frame">
              <div className="landing-stage__meta">
                <span>{demoReviewProject.trustLabel}</span>
                <span>Preview</span>
              </div>

              <div className="landing-stage__screen">
                <div className="landing-stage__player">
                  <div className="landing-stage__player-header">
                    <div>
                      <div className="eyebrow">Now reviewing</div>
                      <h2>{demoReviewProject.title}</h2>
                    </div>
                    <div className="timestamp-pill">{formatTimecode(selectedTimeSec)}</div>
                  </div>

                  <div className="landing-stage__video-frame">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="landing-stage__video"
                      src={demoReviewVideoSrc}
                      onLoadedMetadata={syncPreviewMetadata}
                      onDurationChange={syncPreviewMetadata}
                    />
                  </div>

                  <ReviewTimeline
                    duration={durationSec}
                    currentTime={selectedTimeSec}
                    selectedTimeSec={selectedTimeSec}
                    comments={demoReviewComments}
                    onSeek={seekPreview}
                    onSelectTime={handleSelectTime}
                    onJumpToComment={handleJumpToComment}
                  />
                </div>

                <aside className="landing-stage__rail">
                  <div className="landing-stage__rail-header">
                    <div className="landing-stage__rail-eyebrow">Comments</div>
                    <h3>Exact notes.</h3>
                  </div>

                  <div className="landing-stage__comments">
                    {demoReviewComments.map((comment) => (
                      <button
                        key={comment.id}
                        type="button"
                        className={[
                          'landing-stage__comment',
                          selectedComment?.id === comment.id ? 'is-active' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => handleJumpToComment(comment)}
                      >
                        <span>{comment.authorName}</span>
                        <span>{formatTimecode(comment.timeSec)}</span>
                        <strong>{comment.text.slice(0, 76)}{comment.text.length > 76 ? '…' : ''}</strong>
                      </button>
                    ))}
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
