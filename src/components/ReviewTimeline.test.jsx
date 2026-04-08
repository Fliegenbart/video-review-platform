import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ReviewTimeline from './ReviewTimeline.jsx';

afterEach(cleanup);

describe('ReviewTimeline', () => {
  it('shows the calmer selected-position label', () => {
    render(
      <ReviewTimeline
        duration={120}
        currentTime={30}
        selectedTimeSec={undefined}
        comments={[]}
        onSeek={vi.fn()}
        onSelectTime={vi.fn()}
        onJumpToComment={vi.fn()}
      />
    );

    expect(screen.getByText('Selected moment')).toBeInTheDocument();
  });

  it('uses currentTime for the selected label and marker when no selected time is set', () => {
    const { container } = render(
      <ReviewTimeline
        duration={120}
        currentTime={30}
        selectedTimeSec={undefined}
        comments={[]}
        onSeek={vi.fn()}
        onSelectTime={vi.fn()}
        onJumpToComment={vi.fn()}
      />
    );

    expect(screen.getByText('00:00:30')).toBeInTheDocument();
    expect(container.querySelector('.timeline-selected')).toHaveStyle({
      left: '25%',
    });
  });

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

    const track = screen.getByRole('button', { name: /review timeline/i });
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

  it('ignores track activation without a meaningful pointer position', () => {
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

    fireEvent.click(screen.getByRole('button', { name: /review timeline/i }), {
      clientX: 0,
      detail: 0,
    });

    expect(onSelectTime).not.toHaveBeenCalled();
    expect(onSeek).not.toHaveBeenCalled();
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

    fireEvent.click(screen.getByRole('button', { name: /comment at 00:01:20/i }));

    expect(onJumpToComment).toHaveBeenCalledWith({
      id: 'c2',
      timeSec: 80,
      text: 'CTA',
    });
  });
});
