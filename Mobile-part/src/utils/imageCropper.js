/**
 * Shared configuration for react-native-image-crop-picker so the native crop
 * screen matches the app's current (light/dark) theme. Keeping the colour
 * mapping here means both the incident photo picker and the avatar picker stay
 * visually consistent.
 *
 * The cropper* colour options are honoured by the Android uCrop UI; iOS uses
 * its system cropper and ignores the ones it does not support.
 */
export const buildCropperOptions = (colors) => ({
  mediaType: 'photo',
  cropping: true,
  cropperToolbarColor: colors.card,
  cropperStatusBarColor: colors.card,
  cropperToolbarWidgetColor: colors.text,
  cropperActiveWidgetColor: colors.primary,
});

// The library rejects the promise with this code when the user backs out of the
// picker/cropper. That is a normal cancellation, not an error to surface.
export const isCropperCancelled = (error) => error?.code === 'E_PICKER_CANCELLED';

// Android returns a bare filesystem path; uploads and <Image> expect a file URI.
export const toFileUri = (path = '') =>
  /^(file|content):\/\//.test(path) ? path : `file://${path}`;
