import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  getDataPaths,
  getProjectUploadDir,
  initDataDir,
} from './storage.js';
import { expireProjectVideos } from './videoRetention.js';

const tempDirs = [];

async function makePaths() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vrp-retention-'));
  tempDirs.push(tempDir);
  const paths = getDataPaths(tempDir);
  await initDataDir(paths);
  return paths;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))
  );
});

describe('expireProjectVideos', () => {
  it('clears videos older than the retention window and keeps newer ones', async () => {
    const paths = await makePaths();
    const nowMs = Date.parse('2026-04-08T16:30:00.000Z');
    const retentionMs = 7 * 24 * 60 * 60 * 1000;

    const projects = [
      {
        id: 'old-project',
        title: 'Old',
        video: {
          fileName: 'old.mp4',
          uploadedAt: '2026-03-30T10:00:00.000Z',
        },
      },
      {
        id: 'fresh-project',
        title: 'Fresh',
        video: {
          fileName: 'fresh.mp4',
          uploadedAt: '2026-04-08T10:00:00.000Z',
        },
      },
      {
        id: 'uploading-project',
        title: 'Uploading',
        video: {
          fileName: 'uploading.mp4',
          uploadedAt: '2026-03-30T10:00:00.000Z',
        },
      },
    ];

    for (const project of projects) {
      const uploadDir = getProjectUploadDir(paths, project.id);
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(path.join(uploadDir, project.video.fileName), 'video-data', 'utf8');
    }

    const deletedCount = await expireProjectVideos({
      paths,
      projects,
      nowMs,
      retentionMs,
      skipProjectIds: new Set(['uploading-project']),
    });

    expect(deletedCount).toBe(1);
    expect(projects[0].video).toBeNull();
    expect(projects[1].video?.fileName).toBe('fresh.mp4');
    expect(projects[2].video?.fileName).toBe('uploading.mp4');

    await expect(
      fs.stat(path.join(getProjectUploadDir(paths, 'old-project'), 'old.mp4'))
    ).rejects.toMatchObject({ code: 'ENOENT' });

    await expect(
      fs.stat(path.join(getProjectUploadDir(paths, 'fresh-project'), 'fresh.mp4'))
    ).resolves.toBeTruthy();

    await expect(
      fs.stat(path.join(getProjectUploadDir(paths, 'uploading-project'), 'uploading.mp4'))
    ).resolves.toBeTruthy();
  });
});
