export function buildSalesEmailPrompt(content: string) {
  return [
    "Create a concise cold outbound email based on the website content.",
    "Return a single plain-text email body.",
    `Website content:\n${content}`,
  ].join("\n");
}
