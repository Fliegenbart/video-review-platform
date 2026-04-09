import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';

import { afterEach, describe, expect, it } from 'vitest';

import { getDataPaths, getProjectUploadDir, initDataDir } from './storage.js';
import { storeIncomingVideo } from './videoUpload.js';

const tempDirs = [];

async function makePaths() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vrp-upload-'));
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

describe('storeIncomingVideo', () => {
  it('stores a completed upload and returns the saved metadata', async () => {
    const paths = await makePaths();
    const req = new PassThrough();
    req.complete = true;

    const file = new PassThrough();
    const payload = Buffer.from('video-data');
    const uploadPromise = storeIncomingVideo({
      req,
      file,
      info: { filename: 'review.mp4', mimeType: 'video/mp4' },
      paths,
      projectId: 'p1',
    });

    file.end(payload);

    const video = await uploadPromise;
    expect(video.originalName).toBe('review.mp4');
    expect(video.size).toBe(payload.length);

    const storedPath = path.join(getProjectUploadDir(paths, 'p1'), video.fileName);
    await expect(fs.stat(storedPath)).resolves.toMatchObject({ size: payload.length });
    await expect(fs.readFile(storedPath)).resolves.toEqual(payload);
  });

  it('removes the partial file when the request aborts mid-upload', async () => {
    const paths = await makePaths();
    const req = new PassThrough();
    req.complete = false;

    const file = new PassThrough();
    const uploadPromise = storeIncomingVideo({
      req,
      file,
      info: { filename: 'review.mp4', mimeType: 'video/mp4' },
      paths,
      projectId: 'p2',
    });

    file.write('partial-video-data');
    req.emit('aborted');

    await expect(uploadPromise).rejects.toThrow('Upload aborted before completion');

    const uploadDir = getProjectUploadDir(paths, 'p2');
    await expect(fs.readdir(uploadDir)).resolves.toEqual([]);
  });
});
