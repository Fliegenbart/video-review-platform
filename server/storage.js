import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function randomId(bytes = 12) {
  return crypto.randomBytes(bytes).toString('hex');
}

function randomToken(bytes = 24) {
  // URL-safe token for share links.
  return crypto
    .randomBytes(bytes)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

export function getDataPaths(dataDir) {
  const root = dataDir;
  return {
    root,
    uploadsDir: path.join(root, 'uploads'),
    commentsDir: path.join(root, 'comments'),
    projectsFile: path.join(root, 'projects.json'),
  };
}

export async function initDataDir(paths) {
  await fs.mkdir(paths.root, { recursive: true });
  await fs.mkdir(paths.uploadsDir, { recursive: true });
  await fs.mkdir(paths.commentsDir, { recursive: true });
}

async function readFileIfExists(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (err) {
    if (err && err.code === 'ENOENT') return null;
    throw err;
  }
}

async function writeFileAtomic(filePath, contents) {
  const dir = path.dirname(filePath);
  const tmp = path.join(dir, `.${path.basename(filePath)}.${randomId(6)}.tmp`);
  await fs.writeFile(tmp, contents, 'utf8');
  await fs.rename(tmp, filePath);
}

export async function loadProjects(paths) {
  const raw = await readFileIfExists(paths.projectsFile);
  if (!raw) return [];
  const parsed = safeJsonParse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

export async function saveProjects(paths, projects) {
  await writeFileAtomic(paths.projectsFile, `${JSON.stringify(projects, null, 2)}\n`);
}

export function createProjectRecord({ title }) {
  const id = randomId(12);
  return {
    id,
    title,
    createdAt: nowIso(),
    shareToken: randomToken(),
    video: null,
  };
}

export function publicProjectForShare(project) {
  return {
    title: project.title,
    createdAt: project.createdAt,
    hasVideo: Boolean(project.video),
  };
}

export function findProjectById(projects, id) {
  return projects.find((p) => p && p.id === id) || null;
}

export function findProjectByShareToken(projects, token) {
  return projects.find((p) => p && p.shareToken === token) || null;
}

export function getProjectUploadDir(paths, projectId) {
  return path.join(paths.uploadsDir, projectId);
}

export function getCommentsFile(paths, projectId) {
  return path.join(paths.commentsDir, `${projectId}.jsonl`);
}

export async function listComments(paths, projectId) {
  const filePath = getCommentsFile(paths, projectId);
  const raw = await readFileIfExists(filePath);
  if (!raw) return [];
  const comments = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    const parsed = safeJsonParse(line);
    if (parsed) comments.push(parsed);
  }
  return comments;
}

export function createCommentRecord({ projectId, authorName, timeSec, text }) {
  return {
    id: randomId(12),
    projectId,
    createdAt: nowIso(),
    authorName,
    timeSec,
    text,
    status: 'open',
  };
}

export async function appendComment(paths, projectId, comment) {
  const filePath = getCommentsFile(paths, projectId);
  const line = `${JSON.stringify(comment)}\n`;
  await fs.appendFile(filePath, line, 'utf8');
}

export async function replaceComments(paths, projectId, comments) {
  const filePath = getCommentsFile(paths, projectId);
  const contents = comments.length ? `${comments.map((comment) => JSON.stringify(comment)).join('\n')}\n` : '';
  await writeFileAtomic(filePath, contents);
}

export async function deleteProjectAssets(paths, projectId) {
  await fs.rm(getProjectUploadDir(paths, projectId), { recursive: true, force: true });
  await fs.rm(getCommentsFile(paths, projectId), { force: true });
}
