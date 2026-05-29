import { API_BASE_URL } from '../services/apiClient';

const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');

export const getMediaUri = (media) => {
  if (!media) return null;
  return typeof media === 'string' ? media : media.uri;
};

export const resolveMediaUrl = (url) => {
  if (!url || /^(https?:|data:|blob:|file:|content:)/i.test(url)) {
    return url;
  }

  return `${API_ORIGIN}/${String(url).replace(/^\/+/, '')}`;
};

export const createUploadFile = (media, fallbackName, fallbackType) => {
  const uri = getMediaUri(media);
  if (!uri) return null;

  return {
    uri,
    name: media.name || media.fileName || fallbackName,
    type: media.mimeType || media.type || fallbackType,
  };
};
