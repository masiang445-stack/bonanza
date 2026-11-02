import { createRootRoute, HeadContent, Outlet, Scripts, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { CartDrawer } from "@/components/cart-drawer";
import { SiteHeader } from "@/components/site-header";
import { WebVitalsCollector } from "@/components/web-vitals-metrics";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

const APP_NAME = "Bonanza";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "Bonanza Supply Chain — toko buah tropis dengan rantai dingin terukur. Dipetik pagi, dikirim hari yang sama ke Jakarta.",
      },
      { name: "theme-color", content: "#187090" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: RootLayout,
});

function RootLayout() {
  useEffect(() => {
    sessionStorage.removeItem("bonanza-reload-chunk");
  }, []);

  return (
    <html lang="id" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-bg font-sans text-fg">
        <PreviewHostBridge />
        <AuthProvider>
          <WebVitalsCollector />
          <AppShell />
          <Toaster
            theme="light"
            position="top-center"
            toastOptions={{
              className: "font-sans !bg-surface !text-fg !border-border",
            }}
          />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}

function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLogin = pathname === "/login";

  return (
    <>
      <div className="flex min-h-screen flex-col">
        {isLogin ? null : <SiteHeader />}
        <div className="flex-1">
          <Outlet />
        </div>
      </div>
      {isLogin ? null : <CartDrawer />}
    </>
  );
}
