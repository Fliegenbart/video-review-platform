import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    window.sessionStorage.clear();
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
            comments: [{ id: 'c1', authorName: 'Anna', timeSec: 12, text: 'Title feels too small', status: 'open', createdAt: '2026-04-07T18:00:00.000Z' }],
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

  it('keeps the composer collapsed until the customer starts a comment', async () => {
    render(<ReviewApp token="demo" />);

    await screen.findByRole('button', { name: 'Add comment' });

    expect(screen.getByLabelText('OBSIDIAN mark')).toBeInTheDocument();
    expect(screen.getByText('OBSIDIAN')).toBeInTheDocument();
    expect(screen.getByText('Secure review link')).toBeInTheDocument();
    expect(screen.queryByLabelText('Comment')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add comment' }));

    expect(screen.getByLabelText('Your name')).toBeInTheDocument();
    expect(screen.getByLabelText('Comment')).toBeInTheDocument();
  });

  it('shows a calmer empty state when no comments exist yet', async () => {
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
        return new Response(JSON.stringify({ comments: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`Unexpected request: ${method} ${url}`);
    });

    render(<ReviewApp token="demo" />);

    await screen.findByText('No feedback yet.');
    expect(screen.getByText('Click "Add comment" to start.')).toBeInTheDocument();
  });

  it('opens the composer from the timeline and submits the selected time', async () => {
    render(<ReviewApp token="demo" />);

    await screen.findByRole('button', { name: 'Add comment' });

    fireEvent.click(screen.getByText('Pick timeline time'));

    expect(screen.getByText('Comment at 00:00:42')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Your name'), {
      target: { value: 'Anna' },
    });
    fireEvent.change(screen.getByLabelText('Comment'), {
      target: { value: 'Please tighten the opening.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send comment' }));

    await waitFor(() => {
      const postCall = global.fetch.mock.calls.find(([input, init = {}]) => {
        const url = String(input);
        return url === '/api/share/demo/comments' && init.method === 'POST';
      });

      expect(postCall).toBeDefined();

      const [, init] = postCall;
      expect(JSON.parse(init.body)).toMatchObject({
        authorName: 'Anna',
        text: 'Please tighten the opening.',
        timeSec: 42,
      });
    });
  });

  it('uses the paused scrub position when the video fires seeked instead of timeupdate', async () => {
    global.fetch = vi.fn(async (input, init = {}) => {
      const url = String(input);
      const method = init.method || 'GET';

      if (url === '/api/share/demo' && method === 'GET') {
        await new Promise((resolve) => setTimeout(resolve, 0));
        return new Response(
          JSON.stringify({
            project: { title: 'Launch Cut', createdAt: '2026-04-07T18:00:00.000Z', hasVideo: true },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url === '/api/share/demo/comments' && method === 'GET') {
        await new Promise((resolve) => setTimeout(resolve, 0));
        return new Response(
          JSON.stringify({
            comments: [{ id: 'c1', authorName: 'Anna', timeSec: 12, text: 'Title feels too small', status: 'open', createdAt: '2026-04-07T18:00:00.000Z' }],
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

    const { container } = render(
      <StrictMode>
        <ReviewApp token="demo" />
      </StrictMode>
    );
    const scope = within(container);

    await scope.findByText('Add comment');

    const video = container.querySelector('video');
    expect(video).not.toBeNull();

    Object.defineProperty(video, 'currentTime', {
      configurable: true,
      writable: true,
      value: 2.4,
    });

    fireEvent(video, new Event('seeked'));
    fireEvent.click(scope.getByRole('button', { name: 'Add comment' }));
    fireEvent.change(scope.getByLabelText('Your name'), {
      target: { value: 'Anna' },
    });
    fireEvent.change(scope.getByPlaceholderText('What should change?'), {
      target: { value: 'Please cut into this scene a little earlier.' },
    });
    fireEvent.click(scope.getByRole('button', { name: 'Send comment' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/share/demo/comments',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            authorName: 'Anna',
            text: 'Please cut into this scene a little earlier.',
            timeSec: 2.4,
          }),
        })
      );
    });
  });

  it('reuses the stored reviewer name for later comments in the same browser session', async () => {
    const firstRender = render(<ReviewApp token="demo" />);

    await screen.findByRole('button', { name: 'Add comment' });

    fireEvent.click(screen.getByRole('button', { name: 'Add comment' }));
    fireEvent.change(screen.getByLabelText('Your name'), {
      target: { value: 'Anna' },
    });
    fireEvent.change(screen.getByLabelText('Comment'), {
      target: { value: 'First note' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send comment' }));

    await waitFor(() => {
      expect(window.sessionStorage.getItem('video-reviewer-name')).toBe('Anna');
    });

    firstRender.unmount();

    render(<ReviewApp token="demo" />);

    await screen.findByRole('button', { name: 'Add comment' });

    fireEvent.click(screen.getByRole('button', { name: 'Add comment' }));

    expect(screen.queryByLabelText('Your name')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Comment'), {
      target: { value: 'Second note' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send comment' }));

    await waitFor(() => {
      const postCalls = global.fetch.mock.calls.filter(([input, init = {}]) => {
        const url = String(input);
        return url === '/api/share/demo/comments' && init.method === 'POST';
      });

      const postCall = postCalls.at(-1);

      expect(postCall).toBeDefined();

      const [, init] = postCall;
      expect(JSON.parse(init.body)).toMatchObject({
        authorName: 'Anna',
        text: 'Second note',
      });
    });
  });

  it('uses the live video element time for a fresh comment after jumping to an older comment', async () => {
    const { container } = render(<ReviewApp token="demo" />);

    await screen.findByRole('button', { name: 'Add comment' });

    const video = container.querySelector('video');
    expect(video).not.toBeNull();

    fireEvent.click(screen.getByText('Jump to first comment'));

    Object.defineProperty(video, 'currentTime', {
      configurable: true,
      writable: true,
      value: 37,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add comment' }));
    fireEvent.change(screen.getByLabelText('Your name'), {
      target: { value: 'Anna' },
    });
    fireEvent.change(screen.getByLabelText('Comment'), {
      target: { value: 'A fresh note at the current position' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send comment' }));

    await waitFor(() => {
      const postCall = global.fetch.mock.calls.findLast(([input, init = {}]) => {
        const url = String(input);
        return url === '/api/share/demo/comments' && init.method === 'POST';
      });

      expect(postCall).toBeDefined();

      const [, init] = postCall;
      expect(JSON.parse(init.body)).toMatchObject({
        authorName: 'Anna',
        text: 'A fresh note at the current position',
        timeSec: 37,
      });
    });
  });

  it('lets anyone with the share link delete an existing comment after confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const comments = [
      {
        id: 'c1',
        authorName: 'Anna',
        timeSec: 12,
        text: 'Title feels too small',
        status: 'open',
        createdAt: '2026-04-07T18:00:00.000Z',
      },
    ];

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
        return new Response(JSON.stringify({ comments }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url === '/api/share/demo/comments/c1' && method === 'DELETE') {
        comments.splice(0, comments.length);
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`Unexpected request: ${method} ${url}`);
    });

    render(<ReviewApp token="demo" />);

    await screen.findByText('Title feels too small');
    fireEvent.click(screen.getByRole('button', { name: 'Delete comment' }));

    await waitFor(() => {
      expect(screen.queryByText('Title feels too small')).not.toBeInTheDocument();
      expect(screen.getByText('No feedback yet.')).toBeInTheDocument();
    });

    expect(confirmSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
