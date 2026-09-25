import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UniAllege | Secondary School Portal",
  description: "The UniAllege student and school administration portal.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
