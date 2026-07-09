import { escapeHtml } from "./escapeHtml";
import {
  PAGE_WIDTH_MM,
  PAGE_HEIGHT_MM,
  type PrintTemplate,
  type PrintTemplateElement,
  type PrintDocumentKey,
} from "./customTemplate";
import { PRINT_TEMPLATE_FIELDS } from "./templateFields";

/**
 * Renders a tenant-designed Custom template to a full print HTML document.
 * Known limitation, inherent to any freeform canvas (same as Word text boxes
 * or Canva, not a fixable CSS quirk): absolutely-positioned content doesn't
 * reflow across print page boundaries, so this targets single-page documents
 * with modest line-item counts. Tables get `overflow: visible` so a longer
 * result set overflows messily rather than being silently clipped.
 */

function getPath(data: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, data);
}

/** All interpolated values (tokens and static text) pass through escapeHtml — templates are tenant-authored, persisted, and rendered in another staff member's browser, same trust boundary as printRow/escapeHtml elsewhere in this codebase. */
function substituteTokens(template: string, data: Record<string, unknown>) {
  return template
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, token: string) =>
      escapeHtml(getPath(data, token)),
    )
    .replace(/\n/g, "<br/>");
}

function elementBoxStyle(el: PrintTemplateElement): string {
  return [
    "position:absolute",
    `left:${el.x}%`,
    `top:${el.y}%`,
    `width:${el.width}%`,
    `height:${el.height}%`,
    el.fontSize ? `font-size:${el.fontSize}px` : "",
    el.bold ? "font-weight:bold" : "",
    el.align ? `text-align:${el.align}` : "",
  ]
    .filter(Boolean)
    .join(";");
}

function renderTextElement(el: PrintTemplateElement, data: Record<string, unknown>) {
  return `<div style="${elementBoxStyle(el)}">${substituteTokens(el.content ?? "", data)}</div>`;
}

function renderFieldElement(el: PrintTemplateElement, data: Record<string, unknown>) {
  const value = escapeHtml(el.token ? getPath(data, el.token) : "");
  const label = el.label ? `${escapeHtml(el.label)} ` : "";
  return `<div style="${elementBoxStyle(el)}">${label}${value}</div>`;
}

function renderImageElement(el: PrintTemplateElement, data: Record<string, unknown>) {
  const src = el.token ? getPath(data, el.token) : undefined;
  if (typeof src !== "string" || !src) {
    return `<div style="${elementBoxStyle(el)}"></div>`;
  }
  return `<div style="${elementBoxStyle(el)}"><img src="${escapeHtml(src)}" style="max-width:100%;max-height:100%;object-fit:contain" /></div>`;
}

function renderFlatTableElement(el: PrintTemplateElement, data: Record<string, unknown>, columnLabels: Record<string, string>) {
  const rows = el.tableToken ? getPath(data, el.tableToken) : undefined;
  const columns = el.columns ?? [];
  if (!Array.isArray(rows) || columns.length === 0) {
    return `<div style="${elementBoxStyle(el)};overflow:visible"></div>`;
  }
  const head = columns
    .map((key) => `<th style="text-align:left;border-bottom:1.5px solid #333;padding:4px 6px;font-size:11px">${escapeHtml(columnLabels[key] ?? key)}</th>`)
    .join("");
  const body = rows
    .map((row) => {
      const cells = columns
        .map(
          (key) =>
            `<td style="border-bottom:1px solid #eee;padding:4px 6px;font-size:11.5px">${escapeHtml((row as Record<string, unknown>)?.[key] ?? "")}</td>`,
        )
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  return `<div style="${elementBoxStyle(el)};overflow:visible"><table style="width:100%;border-collapse:collapse"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function renderNestedParametersTable(el: PrintTemplateElement, data: Record<string, unknown>) {
  const tests = el.tableToken ? getPath(data, el.tableToken) : undefined;
  if (!Array.isArray(tests)) return `<div style="${elementBoxStyle(el)};overflow:visible"></div>`;
  const sections = tests
    .map((test) => {
      const t = test as Record<string, unknown>;
      const params = Array.isArray(t.parameters) ? t.parameters : [];
      const rows = params
        .map((p) => {
          const param = p as Record<string, unknown>;
          return `<tr>
            <td style="padding:4px 6px;font-size:11.5px">${escapeHtml(param.name)}</td>
            <td style="padding:4px 6px;font-size:11.5px;text-align:right">${escapeHtml(param.value)}</td>
            <td style="padding:4px 6px;font-size:11.5px">${escapeHtml(param.unit)}</td>
            <td style="padding:4px 6px;font-size:11.5px">${escapeHtml(param.referenceRange)}</td>
            <td style="padding:4px 6px;font-size:11.5px;text-align:right">${escapeHtml(param.flag)}</td>
          </tr>`;
        })
        .join("");
      return `<div style="margin-bottom:12px">
        <div style="font-size:12.5px;font-weight:bold;border-bottom:1.5px solid #333;padding-bottom:3px;margin-bottom:5px">${escapeHtml(t.testName)}</div>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th style="text-align:left;border-bottom:1px solid #ccc;padding:4px 6px;font-size:11px">Parameter</th>
            <th style="text-align:right;border-bottom:1px solid #ccc;padding:4px 6px;font-size:11px">Value</th>
            <th style="text-align:left;border-bottom:1px solid #ccc;padding:4px 6px;font-size:11px">Unit</th>
            <th style="text-align:left;border-bottom:1px solid #ccc;padding:4px 6px;font-size:11px">Reference Range</th>
            <th style="text-align:right;border-bottom:1px solid #ccc;padding:4px 6px;font-size:11px">Flag</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${t.remarks ? `<div style="font-size:11px;color:#555;font-style:italic;margin-top:3px">Remarks: ${escapeHtml(t.remarks)}</div>` : ""}
      </div>`;
    })
    .join("");
  return `<div style="${elementBoxStyle(el)};overflow:visible">${sections}</div>`;
}

function renderNestedNarrativeTable(el: PrintTemplateElement, data: Record<string, unknown>) {
  const tests = el.tableToken ? getPath(data, el.tableToken) : undefined;
  if (!Array.isArray(tests)) return `<div style="${elementBoxStyle(el)};overflow:visible"></div>`;
  const sections = tests
    .map((test) => {
      const t = test as Record<string, unknown>;
      return `<div style="margin-bottom:14px">
        <div style="font-size:12.5px;font-weight:bold;border-bottom:1.5px solid #333;padding-bottom:3px;margin-bottom:6px">${escapeHtml(t.testName)}</div>
        <div style="font-size:11px;font-weight:600;color:#555;text-transform:uppercase;margin-bottom:2px">Findings</div>
        <div style="font-size:12px;line-height:1.6;white-space:pre-wrap;margin-bottom:6px">${escapeHtml(t.findings ?? "—")}</div>
        <div style="font-size:11px;font-weight:600;color:#555;text-transform:uppercase;margin-bottom:2px">Impression</div>
        <div style="font-size:12px;line-height:1.6;white-space:pre-wrap">${escapeHtml(t.impression ?? "—")}</div>
      </div>`;
    })
    .join("");
  return `<div style="${elementBoxStyle(el)};overflow:visible">${sections}</div>`;
}

function renderTableElement(el: PrintTemplateElement, data: Record<string, unknown>, documentKey: PrintDocumentKey) {
  const tableDef = PRINT_TEMPLATE_FIELDS[documentKey]?.tables?.find(
    (t) => t.token === el.tableToken,
  );
  if (tableDef?.kind === "nested") {
    return tableDef.nestedKind === "narrative"
      ? renderNestedNarrativeTable(el, data)
      : renderNestedParametersTable(el, data);
  }
  const columnLabels = Object.fromEntries(
    (tableDef?.columns ?? []).map((c) => [c.key, c.label]),
  );
  return renderFlatTableElement(el, data, columnLabels);
}

function renderElement(el: PrintTemplateElement, data: Record<string, unknown>, documentKey: PrintDocumentKey) {
  switch (el.type) {
    case "text":
      return renderTextElement(el, data);
    case "field":
      return renderFieldElement(el, data);
    case "image":
      return renderImageElement(el, data);
    case "table":
      return renderTableElement(el, data, documentKey);
    default:
      return "";
  }
}

export function renderCustomPrintHtml({
  title,
  documentKey,
  template,
  data,
}: {
  title: string;
  documentKey: PrintDocumentKey;
  template: PrintTemplate;
  data: Record<string, unknown>;
}): string {
  const elementsHtml = template.elements
    .map((el) => renderElement(el, data, documentKey))
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #222; background: #fff; }
    .canvas-page {
      position: relative;
      width: ${PAGE_WIDTH_MM}mm;
      height: ${PAGE_HEIGHT_MM}mm;
      aspect-ratio: ${PAGE_WIDTH_MM} / ${PAGE_HEIGHT_MM};
      margin: 0 auto;
      overflow: visible;
    }
    @media print { @page { size: A4; margin: 0; } }
  </style>
</head>
<body>
  <div class="canvas-page">${elementsHtml}</div>
  <script>
    window.onload = function () { setTimeout(function () { window.print() }, 300) }
  </script>
</body>
</html>`;
}
