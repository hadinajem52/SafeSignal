const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { LIMITS } = require('../../../constants/limits');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');
const INCIDENT_MEDIA_DIR = path.join(UPLOAD_ROOT, 'incidents');

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

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: LIMITS.MAX_VIDEO_BYTES,
    files: LIMITS.MAX_PHOTOS + 1,
  },
});

function toMediaUrl(file) {
  return file ? `/uploads/incidents/${file.filename}` : null;
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

  next();
}

function handleIncidentUploadError(error, _req, res, next) {
  if (!error) {
    next();
    return;
  }

  if (error instanceof multer.MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'Video or photo exceeds the 250 MB upload limit'
        : 'Invalid incident media upload';

    res.status(400).json({ status: 'ERROR', message, code: error.code });
    return;
  }

  next(error);
}

const incidentUpload = [
  upload.fields([
    { name: 'photos', maxCount: LIMITS.MAX_PHOTOS },
    { name: 'video', maxCount: 1 },
  ]),
  handleIncidentUploadError,
  attachIncidentMedia,
];

module.exports = {
  incidentUpload,
  UPLOAD_ROOT,
};
