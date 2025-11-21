import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "proph.bet",
  description: "Internal prediction market",
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

import { Toaster } from "@/components/ui/sonner"
import { CommandPalette } from "@/components/layout/CommandPalette"

export default async function RootLayout({
  children,
  params
}: Props) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale} dir={locale === 'he' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background font-sans overflow-x-hidden`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider messages={messages}>
          <main className="container mx-auto py-8 px-4 overflow-x-hidden">
            {children}
          </main>
          <CommandPalette />
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
