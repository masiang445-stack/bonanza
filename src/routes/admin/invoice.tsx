import { createFileRoute, Link } from "@tanstack/react-router";
import { FileDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Invoice } from "@/components/invoice";
import { QuantityStepper } from "@/components/quantity-stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exportInvoicePdf } from "@/lib/export-files";
import { formatRupiah } from "@/lib/format";
import { todayJakarta } from "@/lib/period";
import {
  getManualInvoice,
  listInvoiceCustomers,
  listManualInvoices,
  mergeManualInvoices,
  payManualInvoice,
  saveInvoiceCustomer,
  saveManualInvoice,
} from "@/lib/server/invoices";
import {
  INVOICE_UNITS,
  billedUnitPrice,
  manualToShopOrder,
  maxQtyForUnit,
  type InvoiceUnit,
  type ManualInvoice,
  type ManualInvoiceCustomer,
  type OrderLine,
} from "@/lib/types";

export const Route = createFileRoute("/admin/invoice")({ component: AdminInvoice });

function asDateInput(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  }
  const iso = String(value ?? "").match(/\d{4}-\d{2}-\d{2}/);
  return iso?.[0] ?? todayJakarta();
}

function AdminInvoice() {
  const [customers, setCustomers] = useState<ManualInvoiceCustomer[]>([]);
  const [invoices, setInvoices] = useState<ManualInvoice[]>([]);
  const [customerId, setCustomerId] = useState<number | "">("");
  const [filterId, setFilterId] = useState<number | "">("");
  const [invoiceId, setInvoiceId] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(todayJakarta);
  const [deliveryDate, setDeliveryDate] = useState(todayJakarta);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [addName, setAddName] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addCashback, setAddCashback] = useState("");
  const [addQty, setAddQty] = useState(1);
  const [addUnit, setAddUnit] = useState<InvoiceUnit>("Kg");
  const [newName, setNewName] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<ManualInvoiceCustomer | null>(null);
  const [busy, setBusy] = useState(false);
  const [payConfirm, setPayConfirm] = useState(false);

  const total = lines.reduce((sum, line) => sum + billedUnitPrice(line) * line.qty, 0);
  const selectedCustomer = customers.find((c) => c.id === customerId);

  const visible = useMemo(
    () => (filterId === "" ? invoices : invoices.filter((row) => row.customerId === filterId)),
    [invoices, filterId],
  );
  const unpaidForCustomer = invoices.filter((row) => row.customerId === customerId && !row.paid);
  const editingPaid = Boolean(invoiceId && invoices.find((row) => row.id === invoiceId)?.paid);
  const previewOrder =
    selectedCustomer && lines.length > 0
      ? manualToShopOrder({
          id: invoiceId ?? "INV-DRAFT",
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          notes,
          paid: editingPaid,
          subtotal: total,
          total,
          createdAt: `${invoiceDate}T00:00:00+07:00`,
          invoiceDate,
          deliveryDate,
          items: lines,
        })
      : null;

  async function reload(keepCustomer?: number) {
    const [nextCustomers, nextInvoices] = await Promise.all([
      listInvoiceCustomers(),
      listManualInvoices({ data: {} }),
    ]);
    setCustomers(nextCustomers);
    setInvoices(nextInvoices);
    if (keepCustomer && nextCustomers.some((c) => c.id === keepCustomer)) {
      setCustomerId(keepCustomer);
    } else if (!customerId && nextCustomers[0]) {
      setCustomerId(nextCustomers[0].id);
    }
  }

  useEffect(() => {
    void reload().catch(() => toast.error("Gagal memuat invoice."));
  }, []);

  function resetForm() {
    setInvoiceId(undefined);
    setNotes("");
    setInvoiceDate(todayJakarta());
    setDeliveryDate(todayJakarta());
    setLines([]);
    setAddName("");
    setAddPrice("");
    setAddCashback("");
    setAddQty(1);
    setAddUnit("Kg");
    setPayConfirm(false);
  }

  function fillForm(invoice: ManualInvoice) {
    setCustomerId(invoice.customerId);
    setInvoiceId(invoice.id);
    setNotes(invoice.notes ?? "");
    setInvoiceDate(asDateInput(invoice.invoiceDate));
    setDeliveryDate(asDateInput(invoice.deliveryDate));
    setLines(
      (invoice.items ?? []).map((line, index) => ({
        slug: line.slug || `line-${index}`,
        name: line.name ?? "",
        qty: Math.min(maxQtyForUnit(line.unit || "Kg"), Math.max(1, Number(line.qty) || 1)),
        price: Math.max(0, Number(line.price) || 0),
        unit: line.unit || "Kg",
        cashback: Math.max(0, Number(line.cashback) || 0),
      })),
    );
    setPayConfirm(false);
  }

  async function onEdit(invoice: ManualInvoice) {
    fillForm(invoice);
    requestAnimationFrame(() => {
      document.getElementById("invoice-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    try {
      const fresh = await getManualInvoice({ data: invoice.id });
      fillForm(fresh);
      toast.success(`Mengedit ${fresh.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuka invoice.");
    }
  }

  function addLine() {
    const name = addName.trim();
    const price = Number(addPrice.replace(/\D/g, ""));
    const cashback = Number(addCashback.replace(/\D/g, "") || "0");
    if (!name) {
      toast.error("Isi jenis buah.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Isi harga.");
      return;
    }
    setLines((prev) => [
      ...prev,
      {
        slug: `${name.toLowerCase()}-${addUnit}-${price}-${cashback}-${prev.length}`,
        name,
        qty: addQty,
        price,
        unit: addUnit,
        cashback,
      },
    ]);
    setAddName("");
    setAddPrice("");
    setAddCashback("");
    setAddQty(1);
  }

  function payload() {
    if (customerId === "") throw new Error("Pilih nama pelanggan.");
    return {
      id: invoiceId,
      customerId,
      notes,
      invoiceDate,
      deliveryDate,
      items: lines.map((line) => ({
        name: line.name,
        qty: line.qty,
        price: line.price,
        unit: line.unit,
        cashback: line.cashback ?? 0,
      })),
    };
  }

  async function onSave() {
    setBusy(true);
    try {
      const saved = await saveManualInvoice({ data: payload() });
      setInvoiceId(saved.id);
      setLines(saved.items);
      await reload(saved.customerId);
      toast.success("Invoice disimpan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  async function onPay() {
    if (!payConfirm) {
      setPayConfirm(true);
      return;
    }
    setBusy(true);
    try {
      await payManualInvoice({ data: payload() });
      await reload(typeof customerId === "number" ? customerId : undefined);
      resetForm();
      toast.success("Lunas. Masuk ke pemasukan, form direset.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menandai lunas.");
    } finally {
      setBusy(false);
      setPayConfirm(false);
    }
  }

  async function onPdf(invoice?: ManualInvoice) {
    const current: ManualInvoice | null = invoice
      ? invoice
      : customerId !== "" && lines.length
        ? {
            id: invoiceId ?? "DRAFT",
            customerId,
            customerName: selectedCustomer?.name ?? "",
            notes,
            paid: false,
            subtotal: total,
            total,
            createdAt: `${invoiceDate}T00:00:00+07:00`,
            invoiceDate,
            deliveryDate,
            items: lines,
          }
        : null;
    if (!current) {
      toast.error("Isi invoice dulu sebelum ekspor PDF.");
      return;
    }
    try {
      await exportInvoicePdf(manualToShopOrder(current));
      toast.success("Invoice PDF diunduh.");
    } catch {
      toast.error("Gagal mengekspor PDF.");
    }
  }

  async function onMerge() {
    if (customerId === "") return;
    setBusy(true);
    try {
      const merged = await mergeManualInvoices({ data: { customerId } });
      fillForm(merged);
      await reload(customerId);
      toast.success("Invoice pelanggan ini digabung.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menggabung.");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveCustomer() {
    const name = (editingCustomer?.name ?? newName).trim();
    if (!name) return;
    setBusy(true);
    try {
      const saved = await saveInvoiceCustomer({
        data: { id: editingCustomer?.id, name },
      });
      setNewName("");
      setEditingCustomer(null);
      await reload(saved.id);
      toast.success(editingCustomer ? "Nama pelanggan diubah." : "Pelanggan ditambah.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan pelanggan.");
    } finally {
      setBusy(false);
    }
  }

  function updateLine(slug: string, patch: Partial<OrderLine>) {
    setLines((prev) => prev.map((line) => (line.slug === slug ? { ...line, ...patch } : line)));
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)]">
        <h2 className="text-xl font-semibold">Pelanggan invoice</h2>
        <p className="mt-1 text-sm text-muted">Tambah atau ubah nama SPPG / pelanggan institusi.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {customers.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => {
                setCustomerId(customer.id);
                setFilterId(customer.id);
                resetForm();
              }}
              className={
                customerId === customer.id
                  ? "inline-flex h-11 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-fg"
                  : "inline-flex h-11 items-center rounded-full bg-bg px-4 text-sm font-medium"
              }
            >
              {customer.name}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input
            value={editingCustomer ? editingCustomer.name : newName}
            onChange={(e) =>
              editingCustomer
                ? setEditingCustomer({ ...editingCustomer, name: e.target.value })
                : setNewName(e.target.value)
            }
            placeholder="Nama pelanggan baru"
          />
          <Button type="button" onClick={() => void onSaveCustomer()} disabled={busy}>
            {editingCustomer ? "Simpan nama" : "Tambah pelanggan"}
          </Button>
          {editingCustomer ? (
            <Button type="button" variant="secondary" onClick={() => setEditingCustomer(null)}>
              Batal
            </Button>
          ) : selectedCustomer ? (
            <Button type="button" variant="secondary" onClick={() => setEditingCustomer(selectedCustomer)}>
              Edit nama
            </Button>
          ) : null}
        </div>
      </section>

      <section id="invoice-editor" className="rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Isi invoice</h2>
            <p className="mt-1 text-sm text-muted">
              {invoiceId ? `No. ${invoiceId}` : "Invoice baru"} · {selectedCustomer?.name ?? "Pilih pelanggan"}
              {editingPaid ? " · Lunas (hanya lihat / PDF)" : ""}
            </p>
            <p className="mt-1 text-xs text-muted">
              PDF hanya menampilkan harga akhir: harga buah + cashback.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => resetForm()} disabled={busy}>
              Baru
            </Button>
            <Button type="button" variant="secondary" onClick={() => void onSave()} disabled={busy || editingPaid}>
              Simpan
            </Button>
            <Button type="button" variant="secondary" onClick={() => void onPdf()} disabled={busy}>
              <FileDown className="size-4" />
              PDF
            </Button>
            <Button type="button" onClick={() => void onPay()} disabled={busy || lines.length === 0 || editingPaid}>
              {payConfirm ? "Konfirmasi bayar" : "Bayar"}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="invoice-date">Tanggal invoice</Label>
            <Input
              id="invoice-date"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="delivery-date">Tanggal pengiriman</Label>
            <Input
              id="delivery-date"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-12">
          <div className="space-y-1.5 md:col-span-3">
            <Label htmlFor="fruit-name">Jenis buah</Label>
            <Input
              id="fruit-name"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="Contoh: Semangka merah"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="fruit-price">Harga buah</Label>
            <Input
              id="fruit-price"
              inputMode="numeric"
              value={addPrice}
              onChange={(e) => setAddPrice(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="fruit-cashback">Cashback</Label>
            <Input
              id="fruit-cashback"
              inputMode="numeric"
              value={addCashback}
              onChange={(e) => setAddCashback(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="fruit-unit">Satuan</Label>
            <select
              id="fruit-unit"
              value={addUnit}
              onChange={(e) => {
                const unit = e.target.value as InvoiceUnit;
                setAddUnit(unit);
                setAddQty((qty) => Math.min(maxQtyForUnit(unit), Math.max(1, qty)));
              }}
              className="h-11 w-full rounded-md border border-border bg-bg px-3 text-sm"
            >
              {INVOICE_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 md:col-span-3">
            <Label>Qty</Label>
            <div className="flex flex-wrap gap-2">
              <QuantityStepper value={addQty} onChange={setAddQty} max={maxQtyForUnit(addUnit)} />
              <Button type="button" variant="secondary" onClick={addLine}>
                Tambah
              </Button>
            </div>
          </div>
        </div>

        {lines.length === 0 ? (
          <p className="mt-6 text-sm text-muted">Belum ada item. Isi jenis buah, harga, cashback, satuan, dan qty.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[56rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                  <th className="py-2 font-medium">Jenis buah</th>
                  <th className="py-2 font-medium">Qty</th>
                  <th className="py-2 font-medium">Satuan</th>
                  <th className="py-2 font-medium">Harga buah</th>
                  <th className="py-2 font-medium">Cashback</th>
                  <th className="py-2 font-medium">Harga akhir</th>
                  <th className="py-2 font-medium">Jumlah</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.slug} className="border-b border-border/70 align-top">
                    <td className="py-3 pr-2">
                      <Input
                        value={line.name}
                        onChange={(e) => updateLine(line.slug, { name: e.target.value })}
                      />
                    </td>
                    <td className="py-3 pr-2">
                      <QuantityStepper
                        value={line.qty}
                        min={0}
                        max={maxQtyForUnit(line.unit)}
                        onChange={(qty) =>
                          qty <= 0
                            ? setLines((prev) => prev.filter((item) => item.slug !== line.slug))
                            : updateLine(line.slug, { qty })
                        }
                      />
                    </td>
                    <td className="py-3 pr-2">
                      <select
                        value={INVOICE_UNITS.includes(line.unit as InvoiceUnit) ? line.unit : "Kg"}
                        onChange={(e) => {
                          const unit = e.target.value;
                          updateLine(line.slug, {
                            unit,
                            qty: Math.min(maxQtyForUnit(unit), Math.max(1, line.qty)),
                          });
                        }}
                        className="h-11 w-full rounded-md border border-border bg-bg px-2 text-sm"
                      >
                        {INVOICE_UNITS.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 pr-2">
                      <Input
                        inputMode="numeric"
                        value={String(line.price)}
                        onChange={(e) =>
                          updateLine(line.slug, { price: Number(e.target.value.replace(/\D/g, "")) || 0 })
                        }
                      />
                    </td>
                    <td className="py-3 pr-2">
                      <Input
                        inputMode="numeric"
                        value={String(line.cashback ?? 0)}
                        onChange={(e) =>
                          updateLine(line.slug, { cashback: Number(e.target.value.replace(/\D/g, "")) || 0 })
                        }
                      />
                    </td>
                    <td className="py-3 tabular-nums">{formatRupiah(billedUnitPrice(line))}</td>
                    <td className="py-3 tabular-nums">{formatRupiah(billedUnitPrice(line) * line.qty)}</td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        className="text-sm text-accent"
                        onClick={() => setLines((prev) => prev.filter((item) => item.slug !== line.slug))}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 space-y-1.5">
          <Label htmlFor="notes">Catatan</Label>
          <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <p className="mt-4 text-right text-lg font-semibold tabular-nums">
          Total pembayaran {formatRupiah(total)}
        </p>
        {previewOrder ? (
          <div className="mt-8">
            <h3 className="text-lg font-semibold">Pratinjau invoice</h3>
            <p className="mt-1 text-sm text-muted">Tampilan sama dengan menu Pesanan.</p>
            <div className="mt-4">
              <Invoice order={previewOrder} />
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Daftar invoice</h2>
          <div className="flex flex-wrap gap-2">
            <select
              value={filterId === "" ? "" : String(filterId)}
              onChange={(e) => setFilterId(e.target.value ? Number(e.target.value) : "")}
              className="h-11 rounded-md border border-border bg-surface px-3 text-sm"
            >
              <option value="">Semua pelanggan</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="secondary"
              disabled={busy || unpaidForCustomer.length < 2}
              onClick={() => void onMerge()}
            >
              Gabung invoice pelanggan
            </Button>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-2xl bg-surface p-8 text-center text-sm text-muted shadow-[var(--shadow-border)]">
            Belum ada invoice pada filter ini.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-surface shadow-[var(--shadow-border)]">
            <table className="w-full min-w-[48rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Pelanggan</th>
                  <th className="px-4 py-3 font-medium">Tgl invoice</th>
                  <th className="px-4 py-3 font-medium">Tgl kirim</th>
                  <th className="px-4 py-3 font-medium">Total pembayaran</th>
                  <th className="px-4 py-3 font-medium">Cashback</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {visible.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-border/70">
                    <td className="px-4 py-3 tabular-nums">{invoice.id}</td>
                    <td className="px-4 py-3">{invoice.customerName}</td>
                    <td className="px-4 py-3 tabular-nums">{asDateInput(invoice.invoiceDate)}</td>
                    <td className="px-4 py-3 tabular-nums">{asDateInput(invoice.deliveryDate)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatRupiah(invoice.total)}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatRupiah(
                        invoice.items.reduce((sum, line) => sum + (line.cashback ?? 0) * line.qty, 0),
                      )}
                    </td>
                    <td className={`px-4 py-3 ${invoice.paid ? "text-primary" : "text-accent"}`}>
                      {invoice.paid ? "Lunas" : "Belum bayar"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => void onEdit(invoice)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => void onPdf(invoice)}
                        >
                          PDF
                        </Button>
                        <Button asChild variant="secondary" size="sm">
                          <Link to="/pesanan/$id" params={{ id: invoice.id }}>
                            Pesanan
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
