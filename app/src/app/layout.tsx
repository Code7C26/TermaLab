import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import LanguageController from "./language-controller";
import "./globals.css";

const title = "TermaLab Cocina";
const description =
  "Controlá la temperatura de tu comida en el horno y recibí una alerta cuando esté lista.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:5173";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const origin = `${protocol}://${host}`;

  return {
    title,
    description,
    applicationName: "TermaLab",
    manifest: "/manifest.webmanifest",
    icons: {
      icon: "/icons/favicon-64.png",
      apple: "/apple-touch-icon.png",
    },
    appleWebApp: {
      capable: true,
      title: "TermaLab",
      statusBarStyle: "default",
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: origin,
      images: [
        {
          url: `${origin}/og.png`,
          width: 1200,
          height: 631,
          alt: "TermaLab Cocina: tu comida, en el punto justo.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${origin}/og.png`],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        {children}
        <LanguageController />
      </body>
    </html>
  );
}
