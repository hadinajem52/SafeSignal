const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { LIMITS } = require('../../../constants/limits');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');
const INCIDENT_MEDIA_DIR = path.join(UPLOAD_ROOT, 'incidents');
const UPLOAD_LIMITS = {
  imageBytes: LIMITS.MAX_PHOTO_BYTES,
  videoBytes: LIMITS.MAX_VIDEO_BYTES,
  totalBytes: LIMITS.MAX_UPLOAD_BYTES,
};

fs.mkdirSync(INCIDENT_MEDIA_DIR, { recursive: true });

const storage = multer.diskStorage({
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

const photoUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: LIMITS.MAX_PHOTO_BYTES,
    files: LIMITS.MAX_PHOTOS,
  },
});

const videoUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: LIMITS.MAX_VIDEO_BYTES,
    files: 1,
  },
});

function rejectOversizedRequest(req, res, next) {
  const contentLength = Number(req.headers['content-length'] || 0);

  if (Number.isFinite(contentLength) && contentLength > UPLOAD_LIMITS.totalBytes) {
    res.status(413).json({
      status: 'ERROR',
      message: 'Total upload must be 300 MB or smaller',
    });
    return;
  }

  next();
}

function getUploadedFiles(req) {
  return [...(req.incidentPhotoFiles || []), ...(req.file ? [req.file] : [])];
}

function cleanupUploadedFiles(req) {
  for (const file of getUploadedFiles(req)) {
    fs.rm(file.path, { force: true }, () => {});
  }
}

function validateUploadedSizes(req, res, next) {
  const photoFiles = req.incidentPhotoFiles || [];
  const videoFiles = req.file ? [req.file] : [];
  const totalBytes = getUploadedFiles(req).reduce((sum, file) => sum + file.size, 0);

  const hasOversizedPhoto = photoFiles.some((file) => file.size > UPLOAD_LIMITS.imageBytes);
  const hasOversizedVideo = videoFiles.some((file) => file.size > UPLOAD_LIMITS.videoBytes);

  if (hasOversizedPhoto || hasOversizedVideo || totalBytes > UPLOAD_LIMITS.totalBytes) {
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

function toMediaUrl(file) {
  return file ? `/uploads/incidents/${file.filename}` : null;
}

function attachIncidentMedia(req, _res, next) {
  const photoFiles = req.incidentPhotoFiles || [];
  const videoFile = req.file || null;

  if (photoFiles.length > 0) {
    req.body.photoUrls = photoFiles.map(toMediaUrl);
  }

  if (videoFile) {
    req.body.videoUrl = toMediaUrl(videoFile);
  }

  next();
}

function stashPhotoFiles(req, _res, next) {
  req.incidentPhotoFiles = req.files || [];
  delete req.files;
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
  photoUpload.array('photos', LIMITS.MAX_PHOTOS),
  handleIncidentUploadError,
  stashPhotoFiles,
  videoUpload.single('video'),
  handleIncidentUploadError,
  validateUploadedSizes,
  attachIncidentMedia,
];

module.exports = {
  incidentUpload,
  cleanupUploadedFiles,
  UPLOAD_ROOT,
};
