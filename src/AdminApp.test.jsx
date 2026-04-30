import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminApp from './AdminApp.jsx';

function createResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function installFetchMock({
  authenticated = true,
  projects = [
    {
      id: 'p1',
      title: 'Spring Campaign',
      createdAt: '2026-04-07T18:00:00.000Z',
      shareToken: 'demo-token',
      sharePath: '/r/demo-token',
      hasVideo: true,
      video: { originalName: 'spring.mp4', size: 1024, uploadedAt: '2026-04-07T18:00:00.000Z' },
      commentCounts: { total: 1, open: 1 },
    },
  ],
  commentsByProject = {
    p1: [
      {
        id: 'c1',
        authorName: 'Lena',
        timeSec: 18,
        text: 'Title feels too small',
        status: 'open',
        createdAt: '2026-04-07T18:00:00.000Z',
      },
    ],
  },
  statusHandler,
  deleteHandler,
  deleteProjectHandler,
} = {}) {
  global.fetch = vi.fn(async (input, init = {}) => {
    const url = String(input);
    const method = init.method || 'GET';

    if (url === '/api/admin/session' && method === 'GET') {
      return createResponse({ authenticated });
    }

    if (url === '/api/admin/projects' && method === 'GET') {
      return createResponse({ projects });
    }

    const commentsMatch = url.match(/^\/api\/admin\/projects\/([^/]+)\/comments$/);
    if (commentsMatch && method === 'GET') {
      return createResponse({ comments: commentsByProject[commentsMatch[1]] || [] });
    }

    const statusMatch = url.match(/^\/api\/admin\/projects\/([^/]+)\/comments\/([^/]+)\/status$/);
    if (statusMatch && method === 'POST' && statusHandler) {
      return statusHandler({
        projectId: statusMatch[1],
        commentId: statusMatch[2],
        init,
        commentsByProject,
      });
    }

    const deleteMatch = url.match(/^\/api\/admin\/projects\/([^/]+)\/comments\/([^/]+)$/);
    if (deleteMatch && method === 'DELETE' && deleteHandler) {
      return deleteHandler({
        projectId: deleteMatch[1],
        commentId: deleteMatch[2],
        init,
        commentsByProject,
        projects,
      });
    }

    const deleteProjectMatch = url.match(/^\/api\/admin\/projects\/([^/]+)$/);
    if (deleteProjectMatch && method === 'DELETE' && deleteProjectHandler) {
      return deleteProjectHandler({
        projectId: deleteProjectMatch[1],
        init,
        commentsByProject,
        projects,
      });
    }

    throw new Error(`Unexpected request: ${method} ${url}`);
  });
}

function installXmlHttpRequestMock() {
  class MockXMLHttpRequest {
    static instances = [];

    constructor() {
      this.upload = {};
      this.headers = {};
      this.status = 0;
      this.responseText = '';
      this.responseContentType = '';
      MockXMLHttpRequest.instances.push(this);
    }

    open(method, url) {
      this.method = method;
      this.url = url;
    }

    setRequestHeader(name, value) {
      this.headers[name] = value;
    }

    getResponseHeader(name) {
      if (String(name).toLowerCase() === 'content-type') {
        return this.responseContentType;
      }
      return null;
    }

    send(body) {
      this.body = body;
    }

    emitProgress(loaded, total) {
      this.upload.onprogress?.({ lengthComputable: true, loaded, total });
    }

    succeed(payload, status = 200, contentType = 'application/json') {
      this.status = status;
      this.responseContentType = contentType;
      this.responseText = contentType.includes('application/json')
        ? JSON.stringify(payload)
        : String(payload ?? '');
      this.onload?.();
    }

    fail() {
      this.onerror?.(new Error('network error'));
    }
  }

  global.XMLHttpRequest = MockXMLHttpRequest;
  return MockXMLHttpRequest;
}

describe('AdminApp', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    installFetchMock();

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(),
      },
    });

    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue();
    installXmlHttpRequestMock();
  });

  it('shows copy feedback and jumps the preview video to the clicked comment', async () => {
    const { container } = render(<AdminApp />);

    await screen.findByText('Projects');
    expect(screen.getByLabelText('OBSIDIAN mark')).toBeInTheDocument();
    expect(screen.getByText('OBSIDIAN')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Spring Campaign'));

    await screen.findByText('Title feels too small');
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));

    await waitFor(() => {
      expect(screen.getByText('Link copied')).toBeInTheDocument();
    });

    const video = container.querySelector('video');
    Object.defineProperty(video, 'currentTime', { value: 0, writable: true });

    fireEvent.click(screen.getByText('Title feels too small'));

    expect(video.currentTime).toBe(18);
  });

  it('checks the admin session before loading protected project data', async () => {
    installFetchMock({ authenticated: false });

    render(<AdminApp />);

    await screen.findByRole('heading', { name: 'Admin sign in' });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/session',
      expect.objectContaining({ method: 'GET' })
    );
    expect(global.fetch).not.toHaveBeenCalledWith(
      '/api/admin/projects',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('shows an inline error message when copying the share link fails', async () => {
    navigator.clipboard.writeText.mockRejectedValueOnce(new Error('copy failed'));

    render(<AdminApp />);

    await screen.findByText('Projects');
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));

    await waitFor(() => {
      expect(screen.getByText('Unable to copy link')).toBeInTheDocument();
    });
  });

  it('does not render a preview video when the selected project has no uploaded video', async () => {
    installFetchMock({
      projects: [
        {
          id: 'p2',
          title: 'Draft Review',
          createdAt: '2026-04-07T18:00:00.000Z',
          shareToken: 'draft-token',
          sharePath: '/r/draft-token',
          hasVideo: false,
          video: null,
          commentCounts: { total: 0, open: 0 },
        },
      ],
      commentsByProject: { p2: [] },
    });

    const { container } = render(<AdminApp />);

    await screen.findByText('Projects');
    fireEvent.click(screen.getByText('Draft Review'));

    await screen.findByText('No video uploaded for this project yet.');
    expect(container.querySelector('video')).toBeNull();
  });

  it('keeps status controls usable while comment jumping remains available', async () => {
    installFetchMock({
      statusHandler: async ({ projectId, commentId, init, commentsByProject }) => {
        const body = JSON.parse(String(init.body));
        commentsByProject[projectId] = commentsByProject[projectId].map((comment) =>
          comment.id === commentId ? { ...comment, status: body.status } : comment
        );
        return createResponse({ ok: true });
      },
    });

    const { container } = render(<AdminApp />);

    await screen.findByText('Projects');
    fireEvent.click(screen.getByText('Spring Campaign'));

    await screen.findByText('Title feels too small');
    const video = container.querySelector('video');
    Object.defineProperty(video, 'currentTime', { value: 0, writable: true });

    fireEvent.click(screen.getByText('Title feels too small'));
    expect(video.currentTime).toBe(18);

    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }));

    await waitFor(() => {
      expect(screen.getByText('Resolved')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reopen' })).toBeInTheDocument();
    });

    video.currentTime = 0;
    fireEvent.click(screen.getByText('Title feels too small'));

    expect(video.currentTime).toBe(18);
    expect(container.querySelector('video')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Spring Campaign' })).toBeInTheDocument();
  });

  it('deletes a comment after confirmation and refreshes the list', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    installFetchMock({
      deleteHandler: async ({ projectId, commentId, commentsByProject, projects }) => {
        commentsByProject[projectId] = commentsByProject[projectId].filter(
          (comment) => comment.id !== commentId
        );
        projects[0] = {
          ...projects[0],
          commentCounts: { total: 0, open: 0 },
        };
        return createResponse({ ok: true });
      },
    });

    render(<AdminApp />);

    await screen.findByText('Projects');
    fireEvent.click(screen.getByText('Spring Campaign'));

    await screen.findByText('Title feels too small');
    fireEvent.click(screen.getByRole('button', { name: 'Delete comment' }));

    await waitFor(() => {
      expect(screen.queryByText('Title feels too small')).not.toBeInTheDocument();
      expect(screen.getByText('No comments yet.')).toBeInTheDocument();
    });

    expect(confirmSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('shows upload progress as a percentage while a video upload is running', async () => {
    const { container } = render(<AdminApp />);

    await screen.findByText('Projects');
    const fileInput = container.querySelector('input[type="file"]');
    const videoFile = new File(['video-data'], 'review.mp4', { type: 'video/mp4' });

    fireEvent.change(fileInput, { target: { files: [videoFile] } });

    const request = global.XMLHttpRequest.instances[0];
    expect(request.method).toBe('POST');
    expect(request.url).toBe('/api/admin/projects/p1/video');

    request.emitProgress(512, 1024);

    await waitFor(() => {
      expect(screen.getByText('50 %')).toBeInTheDocument();
      expect(screen.getByRole('progressbar', { name: 'Upload progress' })).toBeInTheDocument();
    });

    request.succeed({ ok: true });

    await waitFor(() => {
      expect(screen.queryByText('50 %')).not.toBeInTheDocument();
    });
  });

  it('deletes a project after confirmation and removes it from the admin list', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    installFetchMock({
      projects: [
        {
          id: 'p1',
          title: 'Spring Campaign',
          createdAt: '2026-04-07T18:00:00.000Z',
          shareToken: 'demo-token',
          sharePath: '/r/demo-token',
          hasVideo: true,
          video: { originalName: 'spring.mp4', size: 1024, uploadedAt: '2026-04-07T18:00:00.000Z' },
          commentCounts: { total: 1, open: 1 },
        },
        {
          id: 'p2',
          title: 'Summer Spot',
          createdAt: '2026-04-07T18:00:00.000Z',
          shareToken: 'summer-token',
          sharePath: '/r/summer-token',
          hasVideo: false,
          video: null,
          commentCounts: { total: 0, open: 0 },
        },
      ],
      commentsByProject: { p1: [], p2: [] },
      deleteProjectHandler: async ({ projectId, projects, commentsByProject }) => {
        const index = projects.findIndex((project) => project.id === projectId);
        if (index >= 0) {
          projects.splice(index, 1);
        }
        delete commentsByProject[projectId];
        return createResponse({ ok: true });
      },
    });

    render(<AdminApp />);

    await screen.findByText('Projects');
    fireEvent.click(screen.getByText('Spring Campaign'));

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete project' })[0]);

    await waitFor(() => {
      expect(screen.queryByText('Spring Campaign')).not.toBeInTheDocument();
      expect(screen.getByText('Summer Spot')).toBeInTheDocument();
      expect(
        screen.getByText('Select a project to bring the preview and feedback stream into focus.')
      ).toBeInTheDocument();
    });

    expect(confirmSpy).toHaveBeenCalledWith(
      'Delete project "Spring Campaign"? This will permanently remove the video and all comments.'
    );

    confirmSpy.mockRestore();
  });
});
