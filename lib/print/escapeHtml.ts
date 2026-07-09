/** Split out from printDocument.ts (which re-exports it) so renderCustomTemplate.ts can use it without a circular import — printDocument.ts imports renderCustomTemplate.ts for the custom-layout branch. */
export function escapeHtml(str: unknown): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
