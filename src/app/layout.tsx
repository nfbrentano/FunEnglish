import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";
import { SITE_NAME, siteUrl } from "@/lib/site";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_NAME} – Interactive ESL Activities`,
    template: `%s | ${SITE_NAME}`,
  },
  description: "Interactive English activities, games and quizzes for ESL teachers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${cormorant.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
