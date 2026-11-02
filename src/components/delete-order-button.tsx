import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { deleteOrder } from "@/lib/server/shop";

export function DeleteOrderButton({
  orderId,
  onDeleted,
  variant = "link",
  className,
}: {
  orderId: string;
  onDeleted?: (id: string) => void;
  variant?: "link" | "button";
  className?: string;
}) {
  const [phase, setPhase] = useState<"idle" | "confirm" | "busy">("idle");

  async function run() {
    setPhase("busy");
    try {
      const result = await deleteOrder({ data: { id: orderId } });
      toast.success(`Pesanan ${result.id} dihapus`);
      onDeleted?.(result.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus pesanan");
      setPhase("idle");
    }
  }

  if (phase === "confirm" || phase === "busy") {
    return (
      <div className={cn("flex flex-wrap items-center justify-end gap-2", className)}>
        <p className="text-xs text-muted">Hapus {orderId}?</p>
        <button
          type="button"
          disabled={phase === "busy"}
          onClick={() => void run()}
          className="h-11 px-2 text-sm font-medium text-accent disabled:opacity-50"
        >
          {phase === "busy" ? "Menghapus…" : "Ya, hapus"}
        </button>
        <button
          type="button"
          disabled={phase === "busy"}
          onClick={() => setPhase("idle")}
          className="h-11 px-2 text-sm text-muted disabled:opacity-50"
        >
          Batal
        </button>
      </div>
    );
  }

  if (variant === "button") {
    return (
      <Button type="button" variant="secondary" className={className} onClick={() => setPhase("confirm")}>
        Hapus pesanan
      </Button>
    );
  }

  return (
    <button
      type="button"
      className={cn("h-11 px-2 text-sm font-medium text-accent", className)}
      onClick={() => setPhase("confirm")}
    >
      Hapus
    </button>
  );
}
