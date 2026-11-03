export async function enterVideoFullscreen(video) {
  if (!video) return false
  try {
    if (typeof video.requestFullscreen === 'function') { await video.requestFullscreen(); return true }
    if (typeof video.webkitEnterFullscreen === 'function') { video.webkitEnterFullscreen(); return true }
  } catch { /* de browser kan dit weigeren; de standaardbediening blijft beschikbaar */ }
  return false
}
export function supportsVideoFullscreen(video) {
  return !!video && (typeof video.requestFullscreen === 'function' || typeof video.webkitEnterFullscreen === 'function')
}
export function isPlayableVideo(url, nativeHls) {
  return !!url && (!/\.m3u8(?:[?#]|$)/i.test(url) || nativeHls)
}
