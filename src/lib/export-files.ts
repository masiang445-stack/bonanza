import { formatRupiah } from "@/lib/format";
import { formatDeliveryDay, todayJakarta } from "@/lib/period";
import { paymentTotals } from "@/lib/order-totals";
import { SHOP } from "@/lib/shop";
import { ORDER_STATUSES, billedUnitPrice, type LedgerEntry, type ShopOrder } from "@/lib/types";

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ascii(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "");
}

function money(value: number) {
  return ascii(formatRupiah(value));
}

function xml(value: string) {
  return value
    .replace(/&/g, "&" + "amp;")
    .replace(/</g, "&" + "lt;")
    .replace(/>/g, "&" + "gt;")
    .replace(/"/g, "&" + "quot;");
}

async function loadLogoJpeg(): Promise<{ bytes: Uint8Array; width: number; height: number } | null> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("logo"));
      el.src = "/logo.png";
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    if (!blob) return null;
    return {
      bytes: new Uint8Array(await blob.arrayBuffer()),
      width: canvas.width,
      height: canvas.height,
    };
  } catch {
    return null;
  }
}

type Rgb = [number, number, number];

const INK: Rgb = [0.09, 0.11, 0.14];
const MUTED: Rgb = [0.4, 0.45, 0.5];
const TEAL: Rgb = [0.094, 0.439, 0.565];
const MAGENTA: Rgb = [0.635, 0.094, 0.357];
const WHITE: Rgb = [1, 1, 1];
const ROW: Rgb = [0.95, 0.97, 0.98];
const RULE: Rgb = [0.82, 0.86, 0.88];

type PdfOp =
  | { kind: "text"; x: number; y: number; size: number; text: string; bold?: boolean; color?: Rgb }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; color?: Rgb; width?: number }
  | { kind: "rect"; x: number; y: number; w: number; h: number; fill: Rgb }
  | { kind: "image"; x: number; y: number; w: number; h: number };

function pdfEscape(text: string) {
  return ascii(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

const HELV = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 222, 556, 556, 500, 556, 556, 278, 556,
  556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

function textWidth(text: string, size: number, bold = false) {
  let w = 0;
  for (const ch of ascii(text)) {
    const c = ch.charCodeAt(0);
    w += c >= 32 && c <= 126 ? HELV[c - 32]! : 500;
  }
  return (w / 1000) * size * (bold ? 1.04 : 1);
}

function wrapText(text: string, size: number, maxWidth: number, bold = false) {
  const words = ascii(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (textWidth(next, size, bold) <= maxWidth) current = next;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function buildPdf(pages: PdfOp[][], logo: { bytes: Uint8Array; width: number; height: number } | null) {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [0];
  let cursor = 0;

  const push = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === "string" ? enc.encode(chunk) : chunk;
    parts.push(bytes);
    cursor += bytes.length;
  };

  const addObj = (body: string | Uint8Array) => {
    offsets.push(cursor);
    push(body);
  };

  push("%PDF-1.4\n%\x80\x81\x82\x83\n");

  const pageCount = Math.max(1, pages.length);
  const hasLogo = Boolean(logo);
  const pageObjStart = hasLogo ? 6 : 5;
  const fontReg = hasLogo ? 4 : 3;
  const fontBold = hasLogo ? 5 : 4;
  const imageObj = 3;

  addObj("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  const kids = Array.from({ length: pageCount }, (_, i) => `${pageObjStart + i * 2} 0 R`).join(" ");
  addObj(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>\nendobj\n`);

  if (logo) {
    addObj(
      concatBytes(
        enc.encode(
          `${imageObj} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.bytes.length} >>\nstream\n`,
        ),
        logo.bytes,
        enc.encode("\nendstream\nendobj\n"),
      ),
    );
  }

  addObj(`${fontReg} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`);
  addObj(`${fontBold} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`);

  for (let i = 0; i < pageCount; i++) {
    const content = pageStream(pages[i] ?? [], hasLogo);
    const pageObj = pageObjStart + i * 2;
    const contentObj = pageObj + 1;
    const xobjects = hasLogo ? " /XObject << /Im1 3 0 R >>" : "";
    addObj(
      `${pageObj} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontReg} 0 R /F2 ${fontBold} 0 R >>${xobjects} >> /Contents ${contentObj} 0 R >>\nendobj\n`,
    );
    addObj(
      concatBytes(
        enc.encode(`${contentObj} 0 obj\n<< /Length ${content.length} >>\nstream\n`),
        content,
        enc.encode("\nendstream\nendobj\n"),
      ),
    );
  }

  const xrefAt = cursor;
  let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  push(xref);
  push(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);
  return new Blob(parts as BlobPart[], { type: "application/pdf" });
}

function concatBytes(...chunks: Uint8Array[]) {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

function rgb(color: Rgb) {
  return `${color[0].toFixed(3)} ${color[1].toFixed(3)} ${color[2].toFixed(3)}`;
}

function pageStream(ops: PdfOp[], hasLogo: boolean) {
  const lines: string[] = [];
  for (const op of ops) {
    if (op.kind === "text") {
      const font = op.bold ? "F2" : "F1";
      lines.push(`${rgb(op.color ?? INK)} rg`);
      lines.push("BT");
      lines.push(`/${font} ${op.size} Tf`);
      lines.push(`${op.x.toFixed(2)} ${op.y.toFixed(2)} Td`);
      lines.push(`(${pdfEscape(op.text)}) Tj`);
      lines.push("ET");
    } else if (op.kind === "line") {
      lines.push(`${rgb(op.color ?? RULE)} RG`);
      lines.push(`${(op.width ?? 0.6).toFixed(2)} w`);
      lines.push(`${op.x1.toFixed(2)} ${op.y1.toFixed(2)} m ${op.x2.toFixed(2)} ${op.y2.toFixed(2)} l S`);
    } else if (op.kind === "rect") {
      lines.push(`${rgb(op.fill)} rg`);
      lines.push(`${op.x.toFixed(2)} ${op.y.toFixed(2)} ${op.w.toFixed(2)} ${op.h.toFixed(2)} re f`);
    } else if (op.kind === "image" && hasLogo) {
      lines.push("q");
      lines.push(`${op.w.toFixed(2)} 0 0 ${op.h.toFixed(2)} ${op.x.toFixed(2)} ${op.y.toFixed(2)} cm`);
      lines.push("/Im1 Do");
      lines.push("Q");
    }
  }
  return new TextEncoder().encode(lines.join("\n"));
}

function yFromTop(top: number) {
  return 842 - top;
}

type PageBuilder = {
  ops: PdfOp[];
  pages: PdfOp[][];
  top: number;
};

function newBuilder(): PageBuilder {
  return { ops: [], pages: [], top: 36 };
}

function flushPage(b: PageBuilder) {
  b.pages.push(b.ops);
  b.ops = [];
  b.top = 48;
}

function ensure(b: PageBuilder, need = 36) {
  if (b.top + need > 790) flushPage(b);
}

function text(
  b: PageBuilder,
  x: number,
  size: number,
  value: string,
  opts: { bold?: boolean; color?: Rgb; dy?: number } = {},
) {
  b.ops.push({
    kind: "text",
    x,
    y: yFromTop(b.top),
    size,
    text: value,
    bold: opts.bold,
    color: opts.color,
  });
  b.top += opts.dy ?? size + 5;
}

function textAt(
  b: PageBuilder,
  x: number,
  top: number,
  size: number,
  value: string,
  opts: { bold?: boolean; color?: Rgb; align?: "left" | "right" } = {},
) {
  let drawX = x;
  if (opts.align === "right") drawX = x - textWidth(value, size, opts.bold);
  b.ops.push({
    kind: "text",
    x: drawX,
    y: yFromTop(top),
    size,
    text: value,
    bold: opts.bold,
    color: opts.color,
  });
}

function fill(b: PageBuilder, x: number, top: number, w: number, h: number, color: Rgb) {
  b.ops.push({ kind: "rect", x, y: yFromTop(top + h), w, h, fill: color });
}

function rule(b: PageBuilder, x1: number, x2: number, width = 0.6, color: Rgb = RULE) {
  b.ops.push({
    kind: "line",
    x1,
    y1: yFromTop(b.top),
    x2,
    y2: yFromTop(b.top),
    width,
    color,
  });
}

function footer(b: PageBuilder, page: number, total: number, line?: string) {
  b.ops.push({
    kind: "line",
    x1: 40,
    y1: yFromTop(808),
    x2: 555,
    y2: yFromTop(808),
    color: RULE,
    width: 0.5,
  });
  b.ops.push({
    kind: "text",
    x: 40,
    y: yFromTop(822),
    size: 8,
    text: line ?? `${SHOP.legal}  |  ${SHOP.phone}  |  ${SHOP.email}`,
    color: MUTED,
  });
  const label = `Halaman ${page} / ${total}`;
  b.ops.push({
    kind: "text",
    x: 555 - textWidth(label, 8),
    y: yFromTop(822),
    size: 8,
    text: label,
    color: MUTED,
  });
}

export async function exportInvoicePdf(order: ShopOrder) {
  const logo = await loadLogoJpeg();
  const date = new Date(order.createdAt);
  const dateLabel = Number.isNaN(date.getTime())
    ? order.createdAt
    : date.toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" });
  const status = ORDER_STATUSES.find((s) => s.id === order.status)?.label ?? order.status;
  const paidLabel = order.paid ? "LUNAS" : "BELUM DIBAYAR";
  const billedItems = order.items.map((item) => ({
    ...item,
    price: billedUnitPrice(item),
  }));
  const billedTotal = billedItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalQty = billedItems.reduce((n, item) => n + item.qty, 0);
  const deliveryDay = formatDeliveryDay(order.slot);
  const b = newBuilder();

  fill(b, 0, 0, 595, 8, TEAL);

  b.top = 28;
  if (logo) {
    const maxW = 190;
    const maxH = 42;
    let w = maxW;
    let h = w * (logo.height / logo.width);
    if (h > maxH) {
      h = maxH;
      w = h * (logo.width / logo.height);
    }
    b.ops.push({ kind: "image", x: 40, y: yFromTop(28 + h), w, h });
  }

  textAt(b, 555, 32, 9, "INVOICE", { bold: true, color: TEAL, align: "right" });
  textAt(b, 555, 48, 16, order.id, { bold: true, align: "right" });
  textAt(b, 555, 68, 9, dateLabel, { color: MUTED, align: "right" });
  textAt(b, 555, 82, 9, paidLabel, { bold: true, color: order.paid ? TEAL : MAGENTA, align: "right" });

  b.top = 86;
  text(b, 40, 8, SHOP.legal, { bold: true, color: TEAL, dy: 12 });
  text(b, 40, 8, SHOP.address, { color: MUTED, dy: 16 });

  rule(b, 40, 555, 1.2, TEAL);
  b.top += 16;

  fill(b, 40, b.top, 250, 78, ROW);
  fill(b, 305, b.top, 250, 78, ROW);

  const blockTop = b.top + 12;
  textAt(b, 52, blockTop, 7, "PELANGGAN", { bold: true, color: TEAL });
  textAt(b, 52, blockTop + 14, 10, order.name, { bold: true });
  if (order.notes) {
    textAt(b, 52, blockTop + 28, 8, wrapText(`Catatan: ${order.notes}`, 8, 226)[0]!, { color: MUTED });
  }

  textAt(b, 317, blockTop, 7, "PENGIRIMAN", { bold: true, color: TEAL });
  textAt(b, 317, blockTop + 14, 10, deliveryDay, { bold: true });
  textAt(b, 317, blockTop + 28, 8, `Status kirim: ${status}`, { color: MUTED });

  b.top += 94;
  text(b, 40, 9, `Qty total: ${totalQty}    |    ${billedItems.length} jenis buah    |    Jumlah pesanan: ${money(billedTotal)}`, {
    color: MUTED,
    dy: 16,
  });

  const cols = { no: 48, item: 68, qty: 330, unit: 372, price: 455, amount: 547 };
  const headerH = 20;

  const drawTableHeader = () => {
    fill(b, 40, b.top, 515, headerH, TEAL);
    const ht = b.top + 13;
    textAt(b, cols.no, ht, 8, "NO", { bold: true, color: WHITE });
    textAt(b, cols.item, ht, 8, "ITEM", { bold: true, color: WHITE });
    textAt(b, cols.qty, ht, 8, "QTY", { bold: true, color: WHITE, align: "right" });
    textAt(b, cols.unit, ht, 8, "SATUAN", { bold: true, color: WHITE });
    textAt(b, cols.price, ht, 8, "HARGA", { bold: true, color: WHITE, align: "right" });
    textAt(b, cols.amount, ht, 8, "JUMLAH", { bold: true, color: WHITE, align: "right" });
    b.top += headerH;
  };

  drawTableHeader();

  billedItems.forEach((item, index) => {
    const nameLines = wrapText(item.name, 9, 240, true);
    const rowH = Math.max(22, 8 + nameLines.length * 12);
    const pageCount = b.pages.length;
    ensure(b, rowH + 28);
    if (b.pages.length !== pageCount) drawTableHeader();
    if (index % 2 === 0) fill(b, 40, b.top, 515, rowH, ROW);
    const baseline = b.top + 14;
    textAt(b, cols.no, baseline, 9, String(index + 1), { color: MUTED });
    nameLines.forEach((line, i) => textAt(b, cols.item, baseline + i * 11, 9, line, { bold: i === 0 }));
    textAt(b, cols.qty, baseline, 9, String(item.qty), { align: "right" });
    textAt(b, cols.unit, baseline, 8, item.unit, { color: MUTED });
    textAt(b, cols.price, baseline, 9, money(item.price), { align: "right" });
    textAt(b, cols.amount, baseline, 9, money(item.price * item.qty), { bold: true, align: "right" });
    b.top += rowH;
  });

  b.top += 10;
  rule(b, 330, 555, 0.8, RULE);
  b.top += 14;
  const summary: [string, string, boolean][] = [
    ["Total pembayaran", money(billedTotal), true],
  ];
  for (const [label, value, strong] of summary) {
    ensure(b, 22);
    if (strong) {
      fill(b, 330, b.top - 4, 225, 22, TEAL);
      textAt(b, 342, b.top + 11, 10, label, { bold: true, color: WHITE });
      textAt(b, 547, b.top + 11, 10, value, { bold: true, color: WHITE, align: "right" });
      b.top += 26;
    } else {
      textAt(b, 342, b.top, 9, label, { color: MUTED });
      textAt(b, 547, b.top, 9, value, { align: "right" });
      b.top += 16;
    }
  }

  b.top += 18;
  ensure(b, 78);
  fill(b, 40, b.top, 250, 70, ROW);
  textAt(b, 52, b.top + 14, 7, "REKENING PEMBAYARAN", { bold: true, color: TEAL });
  textAt(b, 52, b.top + 30, 10, SHOP.bank.name, { bold: true });
  textAt(b, 52, b.top + 44, 10, SHOP.bank.number, { bold: true });
  textAt(b, 52, b.top + 58, 9, SHOP.bank.bank, { color: MUTED });
  b.top += 82;

  ensure(b, 40);
  text(b, 40, 8, "Invoice ini adalah bukti pemesanan yang sah dari " + SHOP.legal + ".", { color: MUTED, dy: 12 });
  text(b, 40, 8, "Simpan file ini. Pengiriman mengikuti slot yang tercantum.", { color: MUTED, dy: 12 });

  b.pages.push(b.ops);
  const totalPages = b.pages.length;
  b.pages.forEach((ops, i) => {
    const page: PageBuilder = { ops, pages: [], top: 0 };
    footer(page, i + 1, totalPages, `${SHOP.legal}  |  0857-8005-0997`);
  });
  downloadBlob(invoiceFilename(order), buildPdf(b.pages, logo));
}

function invoiceCalendarDay(createdAt: string) {
  const raw = String(createdAt ?? "");
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m && (raw.length === 10 || /\+0?7(:00)?/.test(raw))) return m[1];
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  }
  return m?.[1] ?? todayJakarta();
}

function invoiceFilename(order: ShopOrder) {
  const name = order.name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Pelanggan";
  const ymd = invoiceCalendarDay(order.createdAt);
  const [y, month, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, month - 1, d));
  const hari = dt.toLocaleDateString("id-ID", { weekday: "long", timeZone: "UTC" }).toUpperCase();
  const tanggal = `${String(d).padStart(2, "0")}-${String(month).padStart(2, "0")}-${y}`;
  return `${name} ${hari} ${tanggal}.pdf`;
}

export async function exportFinancePdf(
  rows: LedgerEntry[],
  totals: { masuk: number; keluar: number; saldo: number },
  periodLabel: string,
) {
  const logo = await loadLogoJpeg();
  const pages: PdfOp[][] = [];
  let ops: PdfOp[] = [];
  let top = 48;

  const flush = () => {
    pages.push(ops);
    ops = [];
    top = 48;
  };

  if (logo) {
    const h = 32;
    const w = (logo.width / logo.height) * h;
    ops.push({ kind: "image", x: 40, y: yFromTop(48 + h), w, h });
    top = 48 + h + 12;
  }
  ops.push({ kind: "text", x: 40, y: yFromTop(top), size: 16, text: "Laporan Keuangan", bold: true, color: TEAL });
  top += 22;
  ops.push({ kind: "text", x: 40, y: yFromTop(top), size: 10, text: SHOP.legal });
  top += 14;
  ops.push({ kind: "text", x: 40, y: yFromTop(top), size: 10, text: `Periode: ${periodLabel}`, color: MUTED });
  top += 18;
  ops.push({ kind: "text", x: 40, y: yFromTop(top), size: 10, text: `Masuk: ${money(totals.masuk)}` });
  top += 14;
  ops.push({ kind: "text", x: 40, y: yFromTop(top), size: 10, text: `Keluar: ${money(totals.keluar)}` });
  top += 14;
  ops.push({ kind: "text", x: 40, y: yFromTop(top), size: 10, text: `Saldo: ${money(totals.saldo)}`, bold: true, color: TEAL });
  top += 18;
  ops.push({ kind: "line", x1: 40, y1: yFromTop(top), x2: 555, y2: yFromTop(top), color: TEAL, width: 1.2 });
  top += 16;
  ops.push({ kind: "text", x: 40, y: yFromTop(top), size: 9, text: "Tanggal", bold: true });
  ops.push({ kind: "text", x: 110, y: yFromTop(top), size: 9, text: "Jenis", bold: true });
  ops.push({ kind: "text", x: 160, y: yFromTop(top), size: 9, text: "Kategori", bold: true });
  ops.push({ kind: "text", x: 320, y: yFromTop(top), size: 9, text: "Nominal", bold: true });
  ops.push({ kind: "text", x: 420, y: yFromTop(top), size: 9, text: "Catatan", bold: true });
  top += 14;

  for (const row of rows) {
    if (top > 780) flush();
    const note = ascii(row.note || row.orderId || "").slice(0, 28);
    ops.push({ kind: "text", x: 40, y: yFromTop(top), size: 9, text: row.occurredAt.slice(0, 10) });
    ops.push({ kind: "text", x: 110, y: yFromTop(top), size: 9, text: row.kind === "masuk" ? "Masuk" : "Keluar" });
    ops.push({ kind: "text", x: 160, y: yFromTop(top), size: 9, text: row.category });
    ops.push({
      kind: "text",
      x: 320,
      y: yFromTop(top),
      size: 9,
      text: `${row.kind === "masuk" ? "+" : "-"}${money(row.amount)}`,
      color: row.kind === "masuk" ? TEAL : MAGENTA,
    });
    ops.push({ kind: "text", x: 420, y: yFromTop(top), size: 9, text: note, color: MUTED });
    top += 14;
  }

  pages.push(ops);
  downloadBlob(`bonanza-keuangan.pdf`, buildPdf(pages, logo));
}

export async function exportOrdersPdf(orders: ShopOrder[], periodLabel: string, filename: string) {
  const logo = await loadLogoJpeg();
  const totals = paymentTotals(orders);
  const pages: PdfOp[][] = [];
  let ops: PdfOp[] = [];
  let top = 36;

  const flush = () => {
    pages.push(ops);
    ops = [];
    top = 48;
  };
  const need = (height: number) => {
    if (top + height > 790) flush();
  };

  if (logo) {
    const h = 32;
    const w = (logo.width / logo.height) * h;
    ops.push({ kind: "image", x: 40, y: yFromTop(36 + h), w, h });
    top = 36 + h + 14;
  }
  ops.push({ kind: "text", x: 40, y: yFromTop(top), size: 16, text: "Rekap Pesanan", bold: true, color: TEAL });
  top += 20;
  ops.push({ kind: "text", x: 40, y: yFromTop(top), size: 10, text: SHOP.legal });
  top += 14;
  ops.push({ kind: "text", x: 40, y: yFromTop(top), size: 10, text: `Periode: ${periodLabel}`, color: MUTED });
  top += 16;
  ops.push({
    kind: "text",
    x: 40,
    y: yFromTop(top),
    size: 10,
    text: `${orders.length} pesanan   Total ${money(totals.all)}   Lunas ${money(totals.paid)}   Belum bayar ${money(totals.unpaid)}`,
  });
  top += 16;
  ops.push({ kind: "line", x1: 40, y1: yFromTop(top), x2: 555, y2: yFromTop(top), color: TEAL, width: 1.2 });
  top += 16;

  for (const order of orders) {
    const items = order.items.length ? order.items : [];
    const block = 28 + Math.max(1, items.length) * 12 + 8;
    need(block);
    const status = ORDER_STATUSES.find((s) => s.id === order.status)?.label ?? order.status;
    const pay = order.status === "batal" ? "Batal" : order.paid ? "Lunas" : "Belum bayar";
    ops.push({ kind: "text", x: 40, y: yFromTop(top), size: 9, text: order.id, bold: true });
    ops.push({ kind: "text", x: 145, y: yFromTop(top), size: 9, text: ascii(order.name).slice(0, 28), bold: true });
    ops.push({
      kind: "text",
      x: 330,
      y: yFromTop(top),
      size: 9,
      text: pay,
      bold: true,
      color: order.paid && order.status !== "batal" ? TEAL : MAGENTA,
    });
    ops.push({
      kind: "text",
      x: 555 - textWidth(money(order.total), 9, true),
      y: yFromTop(top),
      size: 9,
      text: money(order.total),
      bold: true,
    });
    top += 13;
    ops.push({
      kind: "text",
      x: 40,
      y: yFromTop(top),
      size: 8,
      text: `Kirim ${ascii(formatDeliveryDay(order.slot))}   ${status}`,
      color: MUTED,
    });
    top += 12;
    const lines = items.length
      ? items.map((item) => `${item.qty} ${item.unit} ${ascii(item.name)}`)
      : ["Tidak ada item"];
    for (const line of lines) {
      ops.push({ kind: "text", x: 40, y: yFromTop(top), size: 9, text: line.slice(0, 90) });
      top += 12;
    }
    top += 4;
    ops.push({ kind: "line", x1: 40, y1: yFromTop(top), x2: 555, y2: yFromTop(top), color: RULE, width: 0.4 });
    top += 10;
  }

  if (orders.length === 0) {
    ops.push({ kind: "text", x: 40, y: yFromTop(top), size: 10, text: "Tidak ada pesanan pada periode ini.", color: MUTED });
  }

  pages.push(ops);
  pages.forEach((pageOps, i) => {
    const page: PageBuilder = { ops: pageOps, pages: [], top: 0 };
    footer(page, i + 1, pages.length, `${SHOP.legal}  |  0857-8005-0997`);
  });
  downloadBlob(filename, buildPdf(pages, logo));
}

export function exportFinanceExcel(
  rows: LedgerEntry[],
  totals: { masuk: number; keluar: number; saldo: number },
  periodLabel: string,
) {
  const stringRow = (values: string[]) =>
    `<Row>${values.map((value) => `<Cell><Data ss:Type="String">${xml(value)}</Data></Cell>`).join("")}</Row>`;
  const numberCell = (n: number) => `<Cell><Data ss:Type="Number">${n}</Data></Cell>`;
  const mixedRow = (label: string, amount: number) =>
    `<Row><Cell><Data ss:Type="String">${xml(label)}</Data></Cell>${numberCell(amount)}</Row>`;

  const body = rows
    .map((row) => {
      const note = xml(row.note || row.orderId || "");
      return `<Row>
        <Cell><Data ss:Type="String">${xml(row.occurredAt.slice(0, 10))}</Data></Cell>
        <Cell><Data ss:Type="String">${row.kind === "masuk" ? "Masuk" : "Keluar"}</Data></Cell>
        <Cell><Data ss:Type="String">${xml(row.category)}</Data></Cell>
        ${numberCell(row.kind === "masuk" ? row.amount : -row.amount)}
        <Cell><Data ss:Type="String">${note}</Data></Cell>
      </Row>`;
    })
    .join("");

  const xmlDoc = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Keuangan">
  <Table>
    ${stringRow(["Laporan Keuangan"])}
    ${stringRow([SHOP.legal])}
    ${stringRow([`Periode: ${periodLabel}`])}
    ${stringRow([""])}
    ${mixedRow("Masuk", totals.masuk)}
    ${mixedRow("Keluar", totals.keluar)}
    ${mixedRow("Saldo", totals.saldo)}
    ${stringRow([""])}
    ${stringRow(["Tanggal", "Jenis", "Kategori", "Nominal", "Catatan"])}
    ${body}
  </Table>
 </Worksheet>
</Workbook>`;
  downloadBlob("bonanza-keuangan.xls", new Blob([xmlDoc], { type: "application/vnd.ms-excel" }));
}
