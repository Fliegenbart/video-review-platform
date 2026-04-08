import React, { useEffect, useMemo, useRef, useState } from 'react';
import { formatTimecode } from './api.js';
import BrandLockup from './components/BrandLockup.jsx';
import ReviewTimeline from './components/ReviewTimeline.jsx';
import {
  demoDetailFacts,
  demoReviewComments,
  demoReviewProject,
  demoReviewVideoSrc,
  demoTrustPoints,
  demoWorkflowSteps,
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
            <p className="landing-lead">
              OBSIDIAN gives creators a quiet, secure room to share work, gather precise client
              feedback, and keep every note tied to the frame it belongs to.
            </p>

            <div className="landing-actions">
              <a className="primary-button landing-button" href="/demo">
                Open secure review
              </a>
              <a className="ghost-button landing-button" href="/admin">
                Admin sign in
              </a>
            </div>

            <ul className="landing-proof-list" aria-label="Trust points">
              {demoTrustPoints.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="landing-stage">
            <div className="landing-stage__frame">
              <div className="landing-stage__meta">
                <span>{demoReviewProject.trustLabel}</span>
                <span>Read-only product preview</span>
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
                    <div className="landing-stage__rail-eyebrow">Comment rail</div>
                    <h3>Quiet, precise feedback.</h3>
                    <p>Clients click a note, land on the right frame, and move on immediately.</p>
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
                        <strong>{comment.text}</strong>
                      </button>
                    ))}
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-facts" aria-label="Product truths">
          <div>
            <span className="landing-facts__label">Private by default</span>
            <p>Secure links, instant playback, no clutter between the client and the cut.</p>
          </div>
          <div>
            <span className="landing-facts__label">Frame-accurate</span>
            <p>Every note lands on the timeline so creators can move from feedback to edits fast.</p>
          </div>
          <div>
            <span className="landing-facts__label">Operationally calm</span>
            <p>The admin side stays polished and quiet, closer to a studio tool than a dashboard.</p>
          </div>
        </section>

        <section className="landing-workflow">
          <div className="landing-section-heading">
            <div className="landing-kicker">Workflow</div>
            <h2>Three steps. No learning curve.</h2>
          </div>

          <div className="landing-workflow__list">
            {demoWorkflowSteps.map((step) => (
              <article key={step.label} className="landing-workflow__item">
                <span className="landing-workflow__index">{step.label}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-detail">
          <div className="landing-detail__copy">
            <div className="landing-kicker">Client confidence</div>
            <h2>Designed to feel obvious before anyone starts thinking about software.</h2>
            <p>
              The review page puts the film first, keeps trust messaging visible, and reveals
              feedback only when it helps. The admin side follows the same material language, so
              the product feels commercially polished from first upload to final approval.
            </p>
          </div>

          <div className="landing-detail__panel">
            <div className="landing-detail__panel-eyebrow">What carries across both screens</div>
            <ul className="landing-detail__list">
              {demoDetailFacts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="landing-final-cta">
          <div>
            <div className="landing-kicker">See the experience</div>
            <h2>Walk through the product the way a client would.</h2>
            <p>
              Open the curated demo to feel the screen, the pacing, and the clarity of the review
              flow before you enter the studio admin.
            </p>
          </div>

          <div className="landing-actions landing-actions--stacked">
            <a className="primary-button landing-button" href="/demo">
              Preview the demo room
            </a>
            <a className="ghost-button landing-button" href="/admin">
              Enter studio admin
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
