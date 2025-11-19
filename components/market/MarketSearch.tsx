"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { useRouter } from "@/lib/navigation"
import { useSearchParams } from "next/navigation"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { useTranslations } from "next-intl"
import { Search } from "lucide-react"

export function MarketSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations("Markets")
  
  const initialQuery = searchParams.get("q") || ""
  const [query, setQuery] = React.useState(initialQuery)
  const debouncedQuery = useDebounce(query, 500)

  // Sync local state if URL changes externally
  React.useEffect(() => {
    const currentQ = searchParams.get("q") || ""
    if (currentQ !== query && currentQ !== debouncedQuery) {
        setQuery(currentQ)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const currentQ = params.get("q") || ""

    if (debouncedQuery !== currentQ) {
      if (debouncedQuery) {
        params.set("q", debouncedQuery)
      } else {
        params.delete("q")
      }
      router.push(`?${params.toString()}`)
    }
  }, [debouncedQuery, router, searchParams])

  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={t("searchPlaceholder")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-8"
      />
    </div>
  )
}

