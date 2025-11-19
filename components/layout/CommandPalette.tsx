"use client"

import * as React from "react"
import { useRouter } from "@/lib/navigation"
import {
  Calendar,
  Settings,
  Search,
  Home,
  Trophy,
} from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { searchCommandPalette, type SearchResult } from "@/app/actions/search"

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const debouncedQuery = useDebounce(query, 300)
  const [data, setData] = React.useState<SearchResult | null>(null)
  const [loading, setLoading] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  React.useEffect(() => {
    const fetchResults = async () => {
      setLoading(true)
      try {
        const results = await searchCommandPalette(debouncedQuery)
        setData(results)
      } catch (error) {
        console.error("Failed to search command palette", error)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [debouncedQuery, open]) // Fetch when query changes or when opened (to get recents)

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [])

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Type a command or search..." 
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          <CommandGroup heading="Suggestions">
            <CommandItem onSelect={() => runCommand(() => router.push("/"))}>
              <Home className="mr-2 h-4 w-4" />
              <span>Home</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/activity"))}>
              <Calendar className="mr-2 h-4 w-4" />
              <span>Activity</span>
            </CommandItem>
             <CommandItem onSelect={() => runCommand(() => router.push("/settings"))}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </CommandItem>
          </CommandGroup>
          
          {data?.arenas && data.arenas.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Arenas">
                {data.arenas.map((arena) => (
                  <CommandItem
                    key={arena.id}
                    onSelect={() => runCommand(() => router.push(`/arenas/${arena.id}/markets`))}
                  >
                    <Trophy className="mr-2 h-4 w-4" />
                    <span>{arena.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {data?.markets && data.markets.length > 0 && (
             <>
              <CommandSeparator />
              <CommandGroup heading="Markets">
                {data.markets.filter(m => m.arena).map((market) => (
                  <CommandItem
                    key={market.id}
                    onSelect={() => runCommand(() => router.push(`/arenas/${market.arena!.id}/markets/${market.id}`))}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    <span>{market.title}</span>
                    <span className="ml-2 text-xs text-muted-foreground">in {market.arena!.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
          
        </CommandList>
      </CommandDialog>
    </>
  )
}

