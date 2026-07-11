export function removeImmediateBacktracks(nodePath) {
  const cleaned = [];
  for (const node of nodePath) {
    if (cleaned.length >= 2 && cleaned[cleaned.length - 2] === node) {
      cleaned.pop();
      continue;
    }
    cleaned.push(node);
  }
  return cleaned;
}
