// Renderizador minimalista de markdown a HTML seguro
// Soporta: **negrita**, *cursiva*, `código`, ```bloques```, listas - / *, saltos de línea
// Usa escape de HTML antes de aplicar reemplazos de markdown

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderMarkdown(texto: string): string {
  let html = escapeHtml(texto);

  // Bloques de código ```
  html = html.replace(
    /```([\s\S]*?)```/g,
    (_, code: string) =>
      `<pre class="bg-fondo border border-borde rounded-md p-2 my-2 text-xs overflow-x-auto"><code>${code.trim()}</code></pre>`
  );

  // Código inline `…`
  html = html.replace(
    /`([^`]+)`/g,
    (_, c: string) =>
      `<code class="bg-fondo border border-borde rounded px-1 py-0.5 text-xs">${c}</code>`
  );

  // Negrita
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Cursiva
  html = html.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");

  // Listas: líneas que empiezan con - o *
  html = html.replace(
    /(^|\n)([-*] .+(?:\n[-*] .+)*)/g,
    (_, pre: string, lista: string) => {
      const items = lista
        .split("\n")
        .map((l) => l.replace(/^[-*]\s+/, ""))
        .map((l) => `<li>${l}</li>`)
        .join("");
      return `${pre}<ul class="list-disc list-inside space-y-1 my-2">${items}</ul>`;
    }
  );

  // Saltos de línea (excluyendo dentro de pre/ul)
  html = html.replace(/\n(?!<)/g, "<br />");

  return html;
}
