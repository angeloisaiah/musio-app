export function normalizeTag(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-') // convert runs of separators to hyphen
    .replace(/-+/g, '-') // collapse duplicate hyphens
    .replace(/^-|-$/g, ''); // trim leading/trailing hyphens
}
