export const buildCropperOptions = (colors) => ({
  mediaType: 'photo',
  cropping: true,
  cropperToolbarColor: colors.card,
  cropperStatusBarColor: colors.card,
  cropperToolbarWidgetColor: colors.text,
  cropperActiveWidgetColor: colors.primary,
});

export const isCropperCancelled = (error) => error?.code === 'E_PICKER_CANCELLED';

export const toFileUri = (path = '') =>
  /^(file|content):\/\//.test(path) ? path : `file://${path}`;
