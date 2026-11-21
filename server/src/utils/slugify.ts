import crypto from 'crypto';

export function slugify(input: string, addUniqueSuffix = false): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!addUniqueSuffix) {
    return base || 'item';
  }

  const suffix = crypto.randomBytes(3).toString('hex');
  return `${base || 'item'}-${suffix}`;
}
