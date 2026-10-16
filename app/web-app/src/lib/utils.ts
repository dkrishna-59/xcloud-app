import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatTimestamp(timestamp: any, formatStr: string = 'MMM d, yyyy HH:mm'): string {
  if (!timestamp) return 'Just now';
  try {
    let millis = 0;
    if (typeof timestamp === 'number') {
      millis = timestamp;
    } else if (timestamp.toMillis && typeof timestamp.toMillis === 'function') {
      millis = timestamp.toMillis();
    } else if (timestamp.seconds) {
      millis = timestamp.seconds * 1000;
    } else if (timestamp instanceof Date) {
      millis = timestamp.getTime();
    } else {
      millis = new Date(timestamp).getTime();
    }

    if (isNaN(millis) || millis === 0) return 'Just now';
    return format(new Date(millis), formatStr);
  } catch (e) {
    return 'Just now';
  }
}
