import { formatTimecode } from '../api.js';
import { clientXToTime, timeToPercent } from '../timeline.js';

export default function ReviewTimeline({
  duration,
  currentTime,
  selectedTimeSec,
  comments = [],
  onSeek,
  onSelectTime,
  onJumpToComment,
}) {
  function handleTrackClick(event) {
    if (event.detail === 0 && event.clientX === 0) {
      return;
    }

    const { left, width } = event.currentTarget.getBoundingClientRect();
    const nextTime = clientXToTime({
      clientX: event.clientX,
      left,
      width,
      duration,
    });

    onSelectTime(nextTime);
    onSeek(nextTime);
  }

  const selectedTime = selectedTimeSec ?? currentTime ?? 0;

  return (
    <div className="timeline-shell">
      <div className="timeline-meta">
        <span>Selected moment</span>
        <span>{formatTimecode(selectedTime)}</span>
      </div>

      <div className="timeline-track-rail">
        <button
          type="button"
          className="timeline-track"
          aria-label="Review timeline"
          onClick={handleTrackClick}
        >
          <span
            className="timeline-progress"
            style={{ width: `${timeToPercent(currentTime, duration)}%` }}
          />
          <span
            className="timeline-selected"
            style={{ left: `${timeToPercent(selectedTime, duration)}%` }}
          />
        </button>

        {comments.map((comment) => (
          <span
            key={comment.id}
            className="timeline-marker-wrap"
            style={{ left: `${timeToPercent(comment.timeSec, duration)}%` }}
          >
            <button
              type="button"
              className="timeline-marker"
              aria-label={`Comment at ${formatTimecode(comment.timeSec)}`}
              onClick={(event) => {
                event.stopPropagation();
                onJumpToComment(comment);
              }}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
