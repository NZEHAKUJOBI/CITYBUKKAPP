import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { ApiError } from '../../lib/errors.js';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Detect the real image type from the file's first bytes; the client's mimetype is only a hint. */
export function sniffImageType(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'png';
  }
  if (buf.length >= 12 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') {
    return 'webp';
  }
  return null;
}

const unsupported = () =>
  new ApiError(415, 'unsupported_media_type', 'Only JPEG, PNG or WebP images are accepted');

export function adminUploadRoutes({ uploadDir }) {
  const r = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 10, parts: 20 },
    fileFilter: (req, file, cb) => (ALLOWED_MIME.has(file.mimetype) ? cb(null, true) : cb(unsupported())),
  }).single('image');

  /** Run multer and translate its errors into the API's error format. */
  const parse = (req, res) => new Promise((resolve, reject) => {
    upload(req, res, (err) => {
      if (!err) return resolve();
      if (err instanceof ApiError) return reject(err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return reject(new ApiError(413, 'file_too_large', `Image must be at most ${MAX_UPLOAD_BYTES / 1024 / 1024} MB`));
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return reject(ApiError.badRequest(`Send the file in a multipart field named 'image' (got '${err.field}')`));
        }
        return reject(ApiError.badRequest(err.message));
      }
      reject(ApiError.badRequest(`Could not read upload: ${err.message}`));
    });
  });

  r.post('/uploads', async (req, res) => {
    if (!req.is('multipart/form-data')) {
      throw ApiError.badRequest("Send multipart/form-data with the file in a field named 'image'");
    }
    await parse(req, res);
    if (!req.file) throw ApiError.badRequest("Missing file field 'image'");

    const ext = sniffImageType(req.file.buffer);
    if (!ext) throw unsupported();

    const filename = `${randomBytes(16).toString('hex')}.${ext}`;
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), req.file.buffer, { flag: 'wx' });
    res.status(201).json({ url: `/uploads/${filename}` });
  });

  return r;
}
