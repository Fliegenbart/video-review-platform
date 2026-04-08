import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  deleteProjectAssets,
  getCommentsFile,
  getDataPaths,
  getProjectUploadDir,
  initDataDir,
} from './storage.js';

const tempDirs = [];

async function makePaths() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vrp-storage-'));
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

describe('deleteProjectAssets', () => {
  it('removes the project upload folder and comments file together', async () => {
    const paths = await makePaths();
    const projectId = 'p1';
    const uploadDir = getProjectUploadDir(paths, projectId);
    const commentsFile = getCommentsFile(paths, projectId);

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, 'video.mp4'), 'video-data', 'utf8');
    await fs.writeFile(commentsFile, '{"id":"c1"}\n', 'utf8');

    await deleteProjectAssets(paths, projectId);

    await expect(fs.stat(uploadDir)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.stat(commentsFile)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
