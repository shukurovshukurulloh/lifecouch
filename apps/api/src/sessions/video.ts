/** Haqiqiy video-konferensiya xizmati (Daily.co/Zoom) hali ulanmagan — vaqtinchalik havola generatsiya qilinadi. */
export function generateVideoLink(sessionId: string): string {
  return `https://meet.lifecouch.dev/${sessionId}`;
}
