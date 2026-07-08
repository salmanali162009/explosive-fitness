import { loading, toast } from './utils.js';

const CLOUD_URL = 'https://api.cloudinary.com/v1_1/newsvwek/image/upload';
const UPLOAD_PRESET = 'gymimage';

export async function uploadImage(file) {
  if (!file) throw new Error('No file selected');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image must be under 5MB');
  if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) throw new Error('Invalid image format');

  loading(true);
  try {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', UPLOAD_PRESET);
    const res = await fetch(CLOUD_URL, { method: 'POST', body: fd });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Upload failed');
    }
    const data = await res.json();
    return data.secure_url;
  } catch (e) {
    toast(e.message, 'fail');
    throw e;
  } finally {
    loading(false);
  }
}
