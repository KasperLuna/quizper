/**
 * Histogram buckets ported from unidata-vert-measure's leaderboard
 * buildBuckets: fixed-width buckets, size rounded up to the nearest 50 so
 * labels stay clean. Monochrome counts — styling is the UI's job.
 */
const TARGET_BUCKET_COUNT = 8;

export function buildBuckets(values: number[]): { label: string; count: number }[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const rawSize = (max - min || 1) / TARGET_BUCKET_COUNT;
  const bucketSize = Math.max(50, Math.ceil(rawSize / 50) * 50);
  const start = Math.floor(min / bucketSize) * bucketSize;
  const end = Math.ceil(max / bucketSize) * bucketSize + bucketSize;
  const buckets: { label: string; count: number }[] = [];
  for (let b = start; b < end; b += bucketSize) {
    buckets.push({
      label: `${b}`,
      count: values.filter((v) => v >= b && v < b + bucketSize).length,
    });
  }
  return buckets;
}
