import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";

const RELOAD_KEY = "bonanza-reload-chunk";

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? "");
}

function isChunkError(error: unknown) {
  return /dynamically imported module|module script failed|Importing a module script failed/i.test(messageOf(error));
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  const chunk = isChunkError(error);

  useEffect(() => {
    if (!chunk) return;
    if (sessionStorage.getItem(RELOAD_KEY) === "1") return;
    sessionStorage.setItem(RELOAD_KEY, "1");
    window.location.reload();
  }, [chunk]);

  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="text-red-500" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold">Halaman gagal dimuat</h1>
      <p className="max-w-md text-sm break-words text-muted">
        {chunk
          ? "Berkas halaman belum selesai terbarui. Muat ulang untuk membuka katalog."
          : messageOf(error) || "Terjadi kesalahan. Coba muat ulang halaman."}
      </p>
      <button
        type="button"
        className="mt-2 inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-fg"
        onClick={() => {
          sessionStorage.removeItem(RELOAD_KEY);
          window.location.reload();
        }}
      >
        Muat ulang
      </button>
    </main>
  );
}
