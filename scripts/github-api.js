/**
 * GitHub API helper to get PR diff
 */

export async function getPRDiff(repoFullName, prNumber, token) {
  const url = `https://patch-diff.githubusercontent.com/raw/${repoFullName}/pull/${prNumber}.diff`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3.diff'
    }
  });

  if (!response.ok) {
    console.error(`Failed to get diff: ${response.status}`);
    return null;
  }

  const text = await response.text();
  // Limit diff size to avoid exceeding token limit
  const maxLength = 10000;
  if (text.length > maxLength) {
    return text.slice(0, maxLength) + '\n\n... (diff truncated due to size limit)';
  }
  return text;
}
