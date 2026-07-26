export function buildCallScriptPrompt(content: string) {
  return [
    "Create a concise cold call script based on the website content.",
    "Return a single plain-text script.",
    `Website content:\n${content}`,
  ].join("\n");
}
