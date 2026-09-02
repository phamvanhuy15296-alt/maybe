export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;

export function sanitizeOptions(options = []) {
  const out = [];
  const seen = new Set();
  for (const raw of options) {
    const label = String(raw ?? '').trim().replace(/\s+/g, ' ');
    if (!label) continue;
    const key = label.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label.slice(0, 80));
    if (out.length >= MAX_OPTIONS) break;
  }
  return out;
}

export function createBalancedMapping(options = []) {
  const n = sanitizeOptions(options).length;
  if (n <= 1) return [0, 0, 0, 0, 0, 0];
  if (n === 2) return [0, 1, 0, 1, 0, 1]; // odd / even
  if (n === 3) return [0, 0, 1, 1, 2, 2];
  return Array.from({ length: 6 }, (_, faceIndex) => faceIndex % n);
}

export function normalizeMapping(mapping, optionCount) {
  const n = Math.max(1, Number(optionCount) || 1);
  const fallback = createBalancedMapping(Array.from({ length: n }, (_, i) => `Option ${i + 1}`));
  return Array.from({ length: 6 }, (_, index) => {
    const value = Number(mapping?.[index]);
    return Number.isInteger(value) && value >= 0 && value < n ? value : fallback[index];
  });
}

export function mappingGroups(options, mapping) {
  const clean = sanitizeOptions(options);
  const normalized = normalizeMapping(mapping, clean.length);
  return clean.map((label, optionIndex) => ({
    optionIndex,
    label,
    faces: normalized
      .map((mappedIndex, faceIndex) => mappedIndex === optionIndex ? faceIndex + 1 : null)
      .filter(Boolean),
  }));
}

export function resolveFaces(faces, options, mapping) {
  const clean = sanitizeOptions(options);
  if (clean.length < MIN_OPTIONS) throw new Error('At least two choices are required.');

  const validFaces = (faces || [])
    .map(Number)
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 6);
  if (!validFaces.length) throw new Error('No valid dice result was found.');

  const normalized = normalizeMapping(mapping, clean.length);
  const votes = validFaces.map((face, dieIndex) => ({
    dieIndex,
    face,
    optionIndex: normalized[face - 1],
    option: clean[normalized[face - 1]],
  }));

  const counts = Array(clean.length).fill(0);
  votes.forEach((vote) => { counts[vote.optionIndex] += 1; });
  const maxVotes = Math.max(...counts);
  const tied = counts
    .map((count, index) => count === maxVotes ? index : -1)
    .filter((index) => index >= 0);

  // Each physical die votes through the same six-face mapping. With 1-5 dice,
  // the highest vote count wins; if several choices tie, the first die whose
  // vote belongs to that tie is the deterministic tie-breaker.
  const tieBroken = tied.length > 1;
  const winnerIndex = tieBroken
    ? (votes.find((vote) => tied.includes(vote.optionIndex))?.optionIndex ?? tied[0])
    : tied[0];

  return {
    faces: validFaces,
    votes,
    counts,
    tieBroken,
    winnerIndex,
    winner: clean[winnerIndex],
  };
}
