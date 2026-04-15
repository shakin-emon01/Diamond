export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function countSourceLines(source: string) {
  return Math.max(source.replace(/\r\n/g, "\n").split("\n").length, 1);
}

export function normalizeLineEndings(source: string) {
  return source.replace(/\r\n/g, "\n");
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function downloadTextFile(contents: string, filename: string, mimeType = "text/plain;charset=utf-8") {
  if (typeof window === "undefined") {
    return;
  }

  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

export function readTextFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read the selected file."));
    reader.readAsText(file);
  });
}
