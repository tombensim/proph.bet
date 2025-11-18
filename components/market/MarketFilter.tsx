"use client"

import { Button } from "@/components/ui/button"
import { useRouter, useSearchParams } from "next/navigation"

export function MarketFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentFilter = searchParams.get("filter")

  const toggleFilter = () => {
    if (currentFilter === "my-positions") {
      router.push("/markets")
    } else {
      router.push("/markets?filter=my-positions")
    }
  }

  return (
    <Button 
      variant={currentFilter === "my-positions" ? "default" : "outline"}
      onClick={toggleFilter}
      className="gap-2"
    >
      My Positions
      {currentFilter === "my-positions" && (
        <span className="ml-1 h-2 w-2 rounded-full bg-primary-foreground animate-pulse" />
      )}
    </Button>
  )
}

