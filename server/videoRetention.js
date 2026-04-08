import fs from 'node:fs/promises';
import path from 'node:path';

import { getProjectUploadDir } from './storage.js';

export async function removeProjectVideo(paths, project) {
  const fileName = project?.video?.fileName;
  if (!fileName) {
    project.video = null;
    return false;
  }

  const uploadDir = getProjectUploadDir(paths, project.id);
  await fs.rm(path.join(uploadDir, fileName), { force: true });

  try {
    const remainingEntries = await fs.readdir(uploadDir);
    if (remainingEntries.length === 0) {
      await fs.rm(uploadDir, { recursive: true, force: true });
    }
  } catch (err) {
    if (err?.code !== 'ENOENT') {
      throw err;
    }
  }

  project.video = null;
  return true;
}

export async function expireProjectVideos({
  paths,
  projects,
  nowMs = Date.now(),
  retentionMs,
  skipProjectIds = new Set(),
}) {
  let deletedCount = 0;

  for (const project of projects) {
    if (!project?.video?.uploadedAt) {
      continue;
    }

    if (skipProjectIds.has(project.id)) {
      continue;
    }

    const uploadedAtMs = Date.parse(project.video.uploadedAt);
    if (Number.isNaN(uploadedAtMs)) {
      continue;
    }

    if (nowMs - uploadedAtMs < retentionMs) {
      continue;
    }

    const removed = await removeProjectVideo(paths, project);
    if (removed) {
      deletedCount += 1;
    }
  }

  return deletedCount;
}
