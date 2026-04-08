import React, { useEffect, useRef, useState } from 'react';
import { formatTimecode } from './api.js';
import BrandLockup from './components/BrandLockup.jsx';
import ReviewTimeline from './components/ReviewTimeline.jsx';
import {
  demoReviewComments,
  demoReviewProject,
  demoReviewVideoSrc,
} from './demoReviewData.js';

function formatCommentDate(value) {
  return new Date(value).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function DemoReviewApp() {
  const videoRef = useRef(null);
  const [durationSec, setDurationSec] = useState(demoReviewProject.durationSec);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [selectedTimeSec, setSelectedTimeSec] = useState(0);
  const [activeCommentId, setActiveCommentId] = useState(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = 'Demo review · OBSIDIAN';
  }, []);

  function seekVideo(timeSec) {
    const nextTime = Math.max(0, Number(timeSec) || 0);
    const video = videoRef.current;

    if (video) {
      video.currentTime = nextTime;
    }

    setCurrentTimeSec(nextTime);
  }

  function syncVideoTime(event) {
    const video = event.currentTarget;
    setCurrentTimeSec(video.currentTime || 0);
  }

  function syncVideoMetadata(event) {
    const video = event.currentTarget;
    setDurationSec(video.duration || demoReviewProject.durationSec);
    setCurrentTimeSec(video.currentTime || 0);
  }

  function handleSelectTime(timeSec) {
    setSelectedTimeSec(timeSec);
    setActiveCommentId(null);
    seekVideo(timeSec);
  }

  function handleJumpToComment(comment) {
    if (!comment) {
      return;
    }

    setActiveCommentId(comment.id);
    setSelectedTimeSec(comment.timeSec);
    seekVideo(comment.timeSec);
  }

  const activeTimeSec = selectedTimeSec ?? currentTimeSec;

  return (
    <div className="review-page demo-review-page">
      <div className="review-page__glow" />

      <div className="review-shell">
        <header className="review-hero">
          <div>
            <BrandLockup />
            <div className="eyebrow">Demo review</div>
            <h1>{demoReviewProject.title}</h1>
            <p>
              This is a read-only preview of the private review experience. Watch the cut,
              inspect the timeline, and jump through client notes without touching live data.
            </p>
          </div>
        </header>

        <main className="review-grid">
          <section className="review-stage__panel">
            <div className="review-stage__header">
              <div>
                <div className="eyebrow">{demoReviewProject.trustLabel}</div>
                <h2>{`Project · ${demoReviewProject.title}`}</h2>
              </div>
              <div className="timestamp-pill">{`Moment ${formatTimecode(activeTimeSec)}`}</div>
            </div>

            <div className="review-video-frame">
              <video
                ref={videoRef}
                controls
                className="review-video"
                src={demoReviewVideoSrc}
                poster=""
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
              comments={demoReviewComments}
              onSeek={seekVideo}
              onSelectTime={handleSelectTime}
              onJumpToComment={handleJumpToComment}
            />
          </section>

          <aside className="review-sidebar">
            <div className="review-sidebar__action review-sidebar__action--readonly">
              <div className="review-sidebar__eyebrow">Read-only demo</div>
              <p>
                The real shared review lets clients pause anywhere and leave a note at that exact
                moment. This preview keeps the page calm and focused while showing the flow.
              </p>
            </div>

            <div className="review-sidebar__header">
              <h3>{`Comments (${demoReviewComments.length})`}</h3>
              <p>Click any note to jump straight to the matching point in the video.</p>
            </div>

            <div className="review-comment-list">
              {demoReviewComments.map((comment) => {
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
                        <span>{comment.authorName}</span>
                        <span>{`At ${formatTimecode(comment.timeSec)}`}</span>
                      </div>

                      <div className="review-comment__meta">
                        <span>{formatCommentDate(comment.createdAt)}</span>
                        <span>{isResolved ? 'Resolved' : 'Open'}</span>
                      </div>

                      <p>{comment.text}</p>
                    </button>

                    <div className="review-comment__footer">
                      <span className="review-comment__label">
                        {isResolved ? 'Resolved in the demo' : 'Pinned on the timeline'}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
