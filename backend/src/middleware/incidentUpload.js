const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { LIMITS } = require('../../../constants/limits');
const logger = require('../utils/logger');

const UPLOAD_LIMITS = {
  imageBytes: LIMITS.MAX_PHOTO_BYTES,
  videoBytes: LIMITS.MAX_VIDEO_BYTES,
  totalBytes: LIMITS.MAX_UPLOAD_BYTES,
};

// When R2 credentials are present use cloud storage; otherwise fall back to
// local disk (development without R2 configured).
const R2_ENABLED = Boolean(process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);

const UPLOAD_ROOT = R2_ENABLED ? null : path.join(__dirname, '..', '..', 'uploads');
const INCIDENT_MEDIA_DIR = UPLOAD_ROOT ? path.join(UPLOAD_ROOT, 'incidents') : null;

if (INCIDENT_MEDIA_DIR) {
  fs.mkdirSync(INCIDENT_MEDIA_DIR, { recursive: true });
}

const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || 'https://pub-743fef4114774b0cbc8dcd46f8aea4bb.r2.dev').replace(/\/$/, '');
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'safesignal-media';
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || 'f46667807c03b4ece1d4d23e52158f3f';

let s3 = null;
if (R2_ENABLED) {
  const { S3Client } = require('@aws-sdk/client-s3');
  s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

const storage = R2_ENABLED
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (_req, _file, callback) => callback(null, INCIDENT_MEDIA_DIR),
      filename: (_req, file, callback) => {
        const extension = path.extname(file.originalname || '').toLowerCase();
        callback(null, `${crypto.randomUUID()}${extension}`);
      },
    });

const fileFilter = (_req, file, callback) => {
  if (file.fieldname === 'photos' && file.mimetype?.startsWith('image/')) {
    callback(null, true);
    return;
  }

  if (file.fieldname === 'video' && file.mimetype?.startsWith('video/')) {
    callback(null, true);
    return;
  }

  callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: LIMITS.MAX_VIDEO_BYTES,
    files: LIMITS.MAX_PHOTOS + 1,
  },
});

function rejectOversizedRequest(req, res, next) {
  const contentLength = Number(req.headers['content-length'] || 0);

  logger.info(
    `Incident upload request received: method=${req.method} path=${req.originalUrl} contentLength=${contentLength || 'unknown'}`
  );

  if (Number.isFinite(contentLength) && contentLength > UPLOAD_LIMITS.totalBytes) {
    logger.warn(
      `Incident upload rejected before parse: contentLength=${contentLength} limit=${UPLOAD_LIMITS.totalBytes}`
    );
    res.status(413).json({
      status: 'ERROR',
      message: 'Total upload must be 300 MB or smaller',
    });
    return;
  }

  next();
}

function getUploadedFiles(req) {
  const files = req.files || {};
  return [...(files.photos || []), ...(files.video || [])];
}

function cleanupUploadedFiles(req) {
  if (R2_ENABLED) return;
  for (const file of getUploadedFiles(req)) {
    logger.warn(`Cleaning up incident upload file: field=${file.fieldname} size=${file.size} path=${file.path}`);
    fs.rm(file.path, { force: true }, () => {});
  }
}

function validateUploadedSizes(req, res, next) {
  const files = req.files || {};
  const photoFiles = files.photos || [];
  const videoFiles = files.video || [];
  const totalBytes = getUploadedFiles(req).reduce((sum, file) => sum + file.size, 0);

  const hasOversizedPhoto = photoFiles.some((file) => file.size > UPLOAD_LIMITS.imageBytes);
  const hasOversizedVideo = videoFiles.some((file) => file.size > UPLOAD_LIMITS.videoBytes);

  logger.info(
    `Incident upload parsed: photos=${photoFiles.length} photoBytes=${photoFiles.reduce((sum, file) => sum + file.size, 0)} videos=${videoFiles.length} videoBytes=${videoFiles.reduce((sum, file) => sum + file.size, 0)} totalBytes=${totalBytes}`
  );

  if (hasOversizedPhoto || hasOversizedVideo || totalBytes > UPLOAD_LIMITS.totalBytes) {
    logger.warn(
      `Incident upload rejected after parse: oversizedPhoto=${hasOversizedPhoto} oversizedVideo=${hasOversizedVideo} totalBytes=${totalBytes}`
    );
    cleanupUploadedFiles(req);
    res.status(400).json({
      status: 'ERROR',
      message: hasOversizedPhoto
        ? 'Each photo must be 10 MB or smaller'
        : hasOversizedVideo
          ? 'Video must be 250 MB or smaller'
          : 'Total upload must be 300 MB or smaller',
    });
    return;
  }

  next();
}

async function uploadFilesToR2(req, res, next) {
  if (!R2_ENABLED) {
    next();
    return;
  }

  const files = getUploadedFiles(req);
  if (files.length === 0) {
    next();
    return;
  }

  try {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    await Promise.all(
      files.map(async (file) => {
        const extension = path.extname(file.originalname || '').toLowerCase();
        const key = `incidents/${crypto.randomUUID()}${extension}`;

        await s3.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
          })
        );

        file.r2Key = key;
        file.r2Url = `${R2_PUBLIC_URL}/${key}`;
      })
    );
    next();
  } catch (err) {
    logger.error(`R2 upload failed: ${err.message}`);
    res.status(500).json({ status: 'ERROR', message: 'Media upload failed' });
  }
}

function toMediaUrl(file) {
  if (!file) return null;
  if (R2_ENABLED) return file.r2Url || null;
  return file.filename ? `/uploads/incidents/${file.filename}` : null;
}

function attachIncidentMedia(req, _res, next) {
  const files = req.files || {};
  const photoFiles = files.photos || [];
  const videoFile = files.video?.[0] || null;

  if (photoFiles.length > 0) {
    req.body.photoUrls = photoFiles.map(toMediaUrl);
  }

  if (videoFile) {
    req.body.videoUrl = toMediaUrl(videoFile);
  }

  logger.info(
    `Incident media attached to request: photoUrls=${req.body.photoUrls?.length || 0} hasVideoUrl=${Boolean(req.body.videoUrl)}`
  );

  next();
}

function handleIncidentUploadError(error, _req, res, next) {
  if (!error) {
    next();
    return;
  }

  if (error instanceof multer.MulterError) {
    cleanupUploadedFiles(_req);
    const fieldName = error.field || 'media';
    logger.warn(
      `Incident upload multer error: code=${error.code} field=${fieldName} message=${error.message}`
    );
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? fieldName === 'photos'
          ? 'Each photo must be 10 MB or smaller'
          : 'Video must be 250 MB or smaller'
        : 'Invalid incident media upload';

    res.status(400).json({ status: 'ERROR', message, code: error.code });
    return;
  }

  next(error);
}

const incidentUpload = [
  rejectOversizedRequest,
  upload.fields([
    { name: 'photos', maxCount: LIMITS.MAX_PHOTOS },
    { name: 'video', maxCount: 1 },
  ]),
  handleIncidentUploadError,
  validateUploadedSizes,
  uploadFilesToR2,
  attachIncidentMedia,
];

module.exports = {
  incidentUpload,
  cleanupUploadedFiles,
  UPLOAD_ROOT,
  INCIDENT_MEDIA_DIR,
  R2_ENABLED,
};
