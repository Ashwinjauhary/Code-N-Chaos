export function levenshteinDistance(a: string, b: string): number {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function isFuzzyMatch(userInput: string, expectedAnswer: string, threshold = 0.70): boolean {
  // Ignore spaces, dashes, and other non-alphanumeric chars
  const cleanUser = userInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanExpected = expectedAnswer.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  if (cleanUser === cleanExpected) return true;
  
  if (cleanUser.length === 0 || cleanExpected.length === 0) return false;

  // Additional check: if one string contains another and length difference is small (e.g. "crawler" vs "crawling")
  // Or just rely on Levenshtein distance
  const distance = levenshteinDistance(cleanUser, cleanExpected);
  const maxLength = Math.max(cleanUser.length, cleanExpected.length);
  
  const similarity = 1 - (distance / maxLength);
  return similarity >= threshold;
}
