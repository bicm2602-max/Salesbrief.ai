export function buildLinkedInPrompt(content: string) {
  return [
    "Create a short LinkedIn outreach message based on the website content.",
    "Return a single plain-text message.",
    `Website content:\n${content}`,
  ].join("\n");
}
