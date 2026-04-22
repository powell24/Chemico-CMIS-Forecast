import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv();

export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  const cached = await redis.get<T>(key);
  if (cached !== null) return cached;

  const value = await fn();
  await redis.set(key, value, { ex: ttlSeconds });
  return value;
}
