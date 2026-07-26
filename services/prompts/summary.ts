export function buildSummaryPrompt(content: string) {
  return [
    "Create a one-paragraph sales summary based on the website content.",
    "Return a single plain-text paragraph.",
    `Website content:\n${content}`,
  ].join("\n");
}
