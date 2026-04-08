import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

import { getProjectUploadDir } from './storage.js';

function pickExtension(filename, mimeType) {
  const lower = String(filename || '').toLowerCase();
  const ext = lower.includes('.') ? lower.split('.').pop() : '';
  const allow = new Set(['mp4', 'mov', 'm4v', 'webm']);
  if (allow.has(ext)) return `.${ext}`;

  const byMime = {
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
    'video/webm': '.webm',
  };
  return byMime[mimeType] || '.mp4';
}

function getAbortError(signal, fallbackMessage) {
  const reason = signal.reason;
  if (reason instanceof Error) {
    return reason;
  }
  return new Error(fallbackMessage);
}

export async function storeIncomingVideo({
  req,
  file,
  info,
  paths,
  projectId,
}) {
  const abortController = new AbortController();
  let writeStream = null;
  let destPath = null;
  let totalSize = 0;

  const abortUpload = (message) => {
    if (!abortController.signal.aborted) {
      const error = new Error(message);
      abortController.abort(error);
      file.destroy(error);
      writeStream?.destroy(error);
    }
  };

  const handleRequestAborted = () => {
    abortUpload('Upload aborted before completion');
  };

  const handleRequestClose = () => {
    if (!req.complete) {
      abortUpload('Upload aborted before completion');
    }
  };

  file.on('data', (chunk) => {
    totalSize += chunk.length;
  });

  file.on('limit', () => {
    abortUpload('File too large');
  });

  req.on('aborted', handleRequestAborted);
  req.on('close', handleRequestClose);

  try {
    const uploadDir = getProjectUploadDir(paths, projectId);
    await fsp.mkdir(uploadDir, { recursive: true });

    const ext = pickExtension(info.filename, info.mimeType);
    const fileName = `video-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    destPath = path.join(uploadDir, fileName);
    writeStream = fs.createWriteStream(destPath);

    await pipeline(file, writeStream, {
      signal: abortController.signal,
    });

    return {
      fileName,
      originalName: info.filename,
      mimeType: info.mimeType || 'video/mp4',
      size: totalSize,
      uploadedAt: new Date().toISOString(),
    };
  } catch (err) {
    if (destPath) {
      await fsp.rm(destPath, { force: true }).catch(() => {});
    }

    if (abortController.signal.aborted) {
      throw getAbortError(abortController.signal, 'Upload failed');
    }

    throw err;
  } finally {
    req.off('aborted', handleRequestAborted);
    req.off('close', handleRequestClose);
  }
}
