"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/lib/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe } from "lucide-react";

export function LocaleSwitcher() {
  const t = useTranslations("Common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const onSelectChange = (value: string) => {
    router.replace(pathname, { locale: value });
  };

  // Map locale codes to abbreviated and full names
  const localeDisplay = {
    en: { short: "en", full: "English" },
    he: { short: "עב", full: "עברית" }
  };

  return (
    <Select defaultValue={locale} onValueChange={onSelectChange}>
      <SelectTrigger className="w-[60px] bg-transparent border-none focus:ring-0 focus:ring-offset-0">
        <Globe className="mr-1 h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{localeDisplay[locale as keyof typeof localeDisplay]?.short || locale}</span>
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="he">עברית</SelectItem>
      </SelectContent>
    </Select>
  );
}

