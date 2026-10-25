/** Сайт нээлттэй байхад энэ давтамжтайгаар "би энд байна" гэж мэдэгдэнэ */
export const HEARTBEAT_MS = 12_000;
/** Сүүлийн мэдэгдлээс хойш энэ хугацаанд бол "Идэвхтэй" */
export const ONLINE_MS = 45_000;

export function isOnline(lastSeen: Date | string | null | undefined, now = Date.now()) {
  if (!lastSeen) return false;
  return now - new Date(lastSeen).getTime() < ONLINE_MS;
}

export function onlineSince(now = Date.now()) {
  return new Date(now - ONLINE_MS);
}
