import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Busboy from 'busboy';
import express from 'express';

import { createAdminAuth } from './auth.js';
import {
  appendComment,
  createCommentRecord,
  createProjectRecord,
  deleteProjectAssets,
  findProjectById,
  findProjectByShareToken,
  getDataPaths,
  getProjectUploadDir,
  initDataDir,
  listComments,
  loadProjects,
  publicProjectForShare,
  replaceComments,
  saveProjects,
} from './storage.js';
import { expireProjectVideos } from './videoRetention.js';
import { storeIncomingVideo } from './videoUpload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function jsonError(res, status, code, details) {
  res.status(status).json({ error: code, details });
}

function requireString(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function formatTimecode(seconds) {
  const value = Math.max(0, Number(seconds) || 0);
  const whole = Math.floor(value);
  const h = String(Math.floor(whole / 3600)).padStart(2, '0');
  const m = String(Math.floor((whole % 3600) / 60)).padStart(2, '0');
  const s = String(whole % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function parseRange(rangeHeader, size) {
  const range = String(rangeHeader || '');
  if (!range.startsWith('bytes=')) return null;
  const [startRaw, endRaw] = range.slice('bytes='.length).split('-');
  const start = startRaw ? Number(startRaw) : NaN;
  const end = endRaw ? Number(endRaw) : NaN;

  if (Number.isNaN(start) && Number.isNaN(end)) return null;

  if (Number.isNaN(start)) {
    // Suffix range: "-500" means last 500 bytes.
    const length = Math.min(size, end);
    return { start: size - length, end: size - 1 };
  }

  const safeStart = Math.max(0, start);
  const safeEnd = Number.isNaN(end) ? size - 1 : Math.min(size - 1, end);
  if (safeStart > safeEnd) return null;
  return { start: safeStart, end: safeEnd };
}

function getConfig() {
  const port = Number(process.env.PORT || 5175);
  const host = process.env.HOST || '127.0.0.1';
  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  const sessionSecret = process.env.SESSION_SECRET || '';

  const production = process.env.NODE_ENV === 'production';
  if (production) {
    if (!adminPassword) throw new Error('Missing required env var: ADMIN_PASSWORD');
    if (!sessionSecret) throw new Error('Missing required env var: SESSION_SECRET');
  }

  const effectiveAdminPassword = adminPassword || 'admin';
  const effectiveSessionSecret = sessionSecret || crypto.randomBytes(24).toString('hex');

  return {
    port,
    host,
    dataDir,
    videoRetentionMs: Number(process.env.VIDEO_RETENTION_MS || 7 * 24 * 60 * 60 * 1000),
    videoCleanupIntervalMs: Number(process.env.VIDEO_CLEANUP_INTERVAL_MS || 60 * 60 * 1000),
    adminPassword: effectiveAdminPassword,
    sessionSecret: effectiveSessionSecret,
    cookieName: process.env.ADMIN_COOKIE_NAME || 'vrp_admin',
  };
}

async function main() {
  const config = getConfig();
  const paths = getDataPaths(config.dataDir);
  await initDataDir(paths);

  const adminAuth = createAdminAuth({
    adminPassword: config.adminPassword,
    sessionSecret: config.sessionSecret,
    cookieName: config.cookieName,
  });

  const app = express();
  const uploadingProjectIds = new Set();
  app.disable('x-powered-by');

  async function cleanupExpiredVideos() {
    const projects = await loadProjects(paths);
    const deletedCount = await expireProjectVideos({
      paths,
      projects,
      retentionMs: config.videoRetentionMs,
      skipProjectIds: uploadingProjectIds,
    });

    if (deletedCount > 0) {
      await saveProjects(paths, projects);
      console.log(`[video-editor] Removed ${deletedCount} expired video upload(s)`);
    }
  }

  await cleanupExpiredVideos();
  setInterval(() => {
    cleanupExpiredVideos().catch((err) => {
      console.error('[video-editor] Failed to clean up expired videos', err);
    });
  }, config.videoCleanupIntervalMs).unref();

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api', express.json({ limit: '2mb' }));

  app.post('/api/admin/session', (req, res) => {
    const password = requireString(req.body?.password);
    if (!password) return jsonError(res, 400, 'missing_password');

    const setCookie = adminAuth.signIn(password);
    if (!setCookie) return jsonError(res, 401, 'invalid_credentials');

    res.setHeader('Set-Cookie', setCookie);
    res.json({ ok: true });
  });

  app.delete('/api/admin/session', (req, res) => {
    res.setHeader('Set-Cookie', adminAuth.signOut());
    res.json({ ok: true });
  });

  app.get('/api/admin/projects', adminAuth.requireAdmin, async (_req, res) => {
    const projects = await loadProjects(paths);
    const enriched = await Promise.all(
      projects.map(async (project) => {
        const comments = await listComments(paths, project.id);
        const openCount = comments.filter((c) => c.status !== 'resolved').length;
        return {
          id: project.id,
          title: project.title,
          createdAt: project.createdAt,
          shareToken: project.shareToken,
          sharePath: `/r/${project.shareToken}`,
          hasVideo: Boolean(project.video),
          video: project.video
            ? {
                originalName: project.video.originalName,
                size: project.video.size,
                uploadedAt: project.video.uploadedAt,
              }
            : null,
          commentCounts: { total: comments.length, open: openCount },
        };
      })
    );
    res.json({ projects: enriched });
  });

  app.post('/api/admin/projects', adminAuth.requireAdmin, async (req, res) => {
    const title = requireString(req.body?.title);
    if (!title) return jsonError(res, 400, 'missing_title');

    const projects = await loadProjects(paths);
    const record = createProjectRecord({ title });
    projects.unshift(record);
    await saveProjects(paths, projects);
    res.status(201).json({ project: record });
  });

  app.delete('/api/admin/projects/:id', adminAuth.requireAdmin, async (req, res) => {
    const id = req.params.id;
    if (uploadingProjectIds.has(id)) {
      return jsonError(res, 409, 'upload_in_progress', 'Wait for the video upload to finish.');
    }

    const projects = await loadProjects(paths);
    const project = findProjectById(projects, id);
    if (!project) return jsonError(res, 404, 'project_not_found');

    const nextProjects = projects.filter((entry) => entry.id !== id);
    await deleteProjectAssets(paths, id);
    await saveProjects(paths, nextProjects);
    res.json({ ok: true });
  });

  app.get('/api/admin/projects/:id/comments', adminAuth.requireAdmin, async (req, res) => {
    const id = req.params.id;
    const projects = await loadProjects(paths);
    const project = findProjectById(projects, id);
    if (!project) return jsonError(res, 404, 'project_not_found');
    const comments = await listComments(paths, project.id);
    res.json({ comments });
  });

  app.post('/api/admin/projects/:id/comments/:commentId/status', adminAuth.requireAdmin, async (req, res) => {
    const id = req.params.id;
    const commentId = req.params.commentId;
    const status = requireString(req.body?.status);
    if (!status || !['open', 'resolved'].includes(status)) return jsonError(res, 400, 'invalid_status');

    const projects = await loadProjects(paths);
    const project = findProjectById(projects, id);
    if (!project) return jsonError(res, 404, 'project_not_found');

    const comments = await listComments(paths, project.id);
    const updated = comments.map((c) => (c.id === commentId ? { ...c, status } : c));
    await replaceComments(paths, project.id, updated);

    res.json({ ok: true });
  });

  app.delete('/api/admin/projects/:id/comments/:commentId', adminAuth.requireAdmin, async (req, res) => {
    const id = req.params.id;
    const commentId = req.params.commentId;

    const projects = await loadProjects(paths);
    const project = findProjectById(projects, id);
    if (!project) return jsonError(res, 404, 'project_not_found');

    const comments = await listComments(paths, project.id);
    const nextComments = comments.filter((comment) => comment.id !== commentId);
    if (nextComments.length === comments.length) return jsonError(res, 404, 'comment_not_found');

    await replaceComments(paths, project.id, nextComments);
    res.json({ ok: true });
  });

  app.post('/api/admin/projects/:id/video', adminAuth.requireAdmin, async (req, res) => {
    const id = req.params.id;
    const projects = await loadProjects(paths);
    const project = findProjectById(projects, id);
    if (!project) return jsonError(res, 404, 'project_not_found');

    const bb = Busboy({
      headers: req.headers,
      limits: { files: 1, fileSize: 1024 * 1024 * 1024 * 25 }, // 25GB hard limit
    });

    let handled = false;
    let uploadError = null;
    let processing = null;

    bb.on('file', (fieldname, file, info) => {
      if (fieldname !== 'video' || handled) {
        file.resume();
        return;
      }
      handled = true;
      uploadingProjectIds.add(project.id);

      processing = (async () => {
        try {
          const uploadDir = getProjectUploadDir(paths, project.id);
          await fsp.mkdir(uploadDir, { recursive: true });
          const nextVideo = await storeIncomingVideo({
            req,
            file,
            info,
            paths,
            projectId: project.id,
          });

          // Remove the old uploaded file (if present).
          if (project.video?.fileName) {
            const oldPath = path.join(uploadDir, project.video.fileName);
            fsp.unlink(oldPath).catch(() => {});
          }

          project.video = nextVideo;

          await saveProjects(paths, projects);
        } finally {
          uploadingProjectIds.delete(project.id);
        }
      })().catch((err) => {
        uploadError = err;
      });
    });

    bb.on('error', (err) => {
      uploadError = err;
    });

    bb.on('finish', () => {
      Promise.resolve(processing)
        .then(() => {
          if (uploadError) return jsonError(res, 400, 'upload_failed', uploadError.message);
          if (!handled) return jsonError(res, 400, 'missing_video_file');
          res.json({ ok: true });
        })
        .catch((err) => jsonError(res, 500, 'upload_failed', err?.message));
    });

    req.pipe(bb);
  });

  app.get('/api/share/:token', async (req, res) => {
    const token = req.params.token;
    const projects = await loadProjects(paths);
    const project = findProjectByShareToken(projects, token);
    if (!project) return jsonError(res, 404, 'not_found');
    res.json({ project: publicProjectForShare(project) });
  });

  app.get('/api/share/:token/comments', async (req, res) => {
    const token = req.params.token;
    const projects = await loadProjects(paths);
    const project = findProjectByShareToken(projects, token);
    if (!project) return jsonError(res, 404, 'not_found');
    const comments = await listComments(paths, project.id);
    res.json({ comments });
  });

  app.post('/api/share/:token/comments', async (req, res) => {
    const token = req.params.token;
    const projects = await loadProjects(paths);
    const project = findProjectByShareToken(projects, token);
    if (!project) return jsonError(res, 404, 'not_found');
    if (!project.video) return jsonError(res, 400, 'no_video_uploaded');

    const authorName = requireString(req.body?.authorName) || 'Client';
    const text = requireString(req.body?.text);
    const timeSec = Number(req.body?.timeSec);
    if (!text) return jsonError(res, 400, 'missing_text');
    if (!Number.isFinite(timeSec) || timeSec < 0) return jsonError(res, 400, 'invalid_time');

    const comment = createCommentRecord({
      projectId: project.id,
      authorName,
      timeSec,
      text,
    });

    await appendComment(paths, project.id, comment);
    res.status(201).json({ comment });
  });

  app.delete('/api/share/:token/comments/:commentId', async (req, res) => {
    const token = req.params.token;
    const commentId = req.params.commentId;
    const projects = await loadProjects(paths);
    const project = findProjectByShareToken(projects, token);
    if (!project) return jsonError(res, 404, 'not_found');

    const comments = await listComments(paths, project.id);
    const nextComments = comments.filter((comment) => comment.id !== commentId);
    if (nextComments.length === comments.length) return jsonError(res, 404, 'comment_not_found');

    await replaceComments(paths, project.id, nextComments);
    res.json({ ok: true });
  });

  app.get('/api/share/:token/video', async (req, res) => {
    const token = req.params.token;
    const projects = await loadProjects(paths);
    const project = findProjectByShareToken(projects, token);
    if (!project || !project.video) return res.status(404).end();

    const uploadDir = getProjectUploadDir(paths, project.id);
    const videoPath = path.join(uploadDir, project.video.fileName);

    let stat;
    try {
      stat = await fsp.stat(videoPath);
    } catch {
      return res.status(404).end();
    }

    const size = stat.size;
    const range = parseRange(req.headers.range, size);
    const contentType = project.video.mimeType || 'video/mp4';

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=0, no-cache');

    if (!range) {
      res.status(200);
      res.setHeader('Content-Length', String(size));
      fs.createReadStream(videoPath).pipe(res);
      return;
    }

    res.status(206);
    res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
    res.setHeader('Content-Length', String(range.end - range.start + 1));
    fs.createReadStream(videoPath, { start: range.start, end: range.end }).pipe(res);
  });

  // Serve built frontend in production.
  const distDir = path.join(process.cwd(), 'dist');
  const distIndex = path.join(distDir, 'index.html');
  const hasDist = fs.existsSync(distIndex);
  if (hasDist && process.env.NODE_ENV === 'production') {
    app.use(express.static(distDir));
    app.get(/^(?!\/api\/).*/, (req, res) => {
      res.sendFile(distIndex);
    });
  }

  app.listen(config.port, config.host, () => {
    const baseUrl = `http://${config.host}:${config.port}`;
    console.log(`[video-editor] API listening on ${baseUrl}`);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[video-editor] Admin password (dev): ${config.adminPassword}`);
      if (!process.env.SESSION_SECRET) {
        console.log('[video-editor] SESSION_SECRET not set, using a random in-memory value for dev');
      }
    }
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
