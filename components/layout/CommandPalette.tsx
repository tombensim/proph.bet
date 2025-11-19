"use client"

import * as React from "react"
import { useRouter } from "@/lib/navigation"
import { useParams, usePathname } from "next/navigation"
import {
  Calendar,
  Settings,
  Search,
  Home,
  Trophy,
  Plus,
  Users,
  BarChart
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
  const params = useParams()
  const pathname = usePathname()
  
  // Detect if we are inside an arena
  const currentArenaId = typeof params?.arenaId === 'string' ? params.arenaId : null

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
  }, [debouncedQuery, open]) 

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

          {/* Context Aware Commands (Current Arena) */}
          {currentArenaId && !query && (
            <CommandGroup heading="Current Arena">
              <CommandItem onSelect={() => runCommand(() => router.push(`/arenas/${currentArenaId}/markets/create`))}>
                <Plus className="mr-2 h-4 w-4" />
                <span>Create Market</span>
                <CommandShortcut>C</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push(`/arenas/${currentArenaId}/leaderboard`))}>
                <BarChart className="mr-2 h-4 w-4" />
                <span>Leaderboard</span>
                <CommandShortcut>L</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push(`/arenas/${currentArenaId}/members`))}>
                <Users className="mr-2 h-4 w-4" />
                <span>Members</span>
              </CommandItem>
               <CommandItem onSelect={() => runCommand(() => router.push(`/arenas/${currentArenaId}/settings`))}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Arena Settings</span>
              </CommandItem>
            </CommandGroup>
          )}

          {currentArenaId && !query && <CommandSeparator />}
          
          {/* Actions from Search */}
          {data?.actions && data.actions.length > 0 && (
            <>
              <CommandGroup heading="Actions">
                {data.actions.map((action, index) => (
                  <CommandItem
                    key={`${action.type}-${action.arenaId}`}
                    onSelect={() => {
                      if (action.type === "create_market") {
                        runCommand(() => router.push(`/arenas/${action.arenaId}/markets/create`))
                      } else if (action.type === "settings") {
                        runCommand(() => router.push(`/arenas/${action.arenaId}/settings`))
                      }
                    }}
                  >
                    {action.type === "create_market" ? <Plus className="mr-2 h-4 w-4" /> : <Settings className="mr-2 h-4 w-4" />}
                    <span>
                      {action.type === "create_market" ? "Create Market in " : "Settings for "} 
                      {action.arenaName}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

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
              <span>Global Settings</span>
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
                    {arena.role === "ADMIN" && <span className="ml-2 text-xs bg-muted px-1 rounded">Admin</span>}
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
