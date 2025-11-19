"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

interface ArenaFilterProps {
  arenas: { id: string, name: string }[]
}

export function ArenaFilter({ arenas }: ArenaFilterProps) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const currentArenaId = searchParams.get("arenaId")
  const currentArena = arenas.find(a => a.id === currentArenaId)

  const onSelect = (arenaId?: string) => {
    const params = new URLSearchParams(searchParams)
    if (arenaId) {
      params.set("arenaId", arenaId)
    } else {
      params.delete("arenaId")
    }
    router.push(`${pathname}?${params.toString()}`)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-[200px] justify-between">
          <div className="flex items-center">
            <Filter className="mr-2 h-4 w-4 opacity-50" />
            <span className="truncate">{currentArena ? currentArena.name : "All Arenas"}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Filter by arena..." />
          <CommandList>
            <CommandEmpty>No arena found.</CommandEmpty>
            <CommandGroup>
                <CommandItem
                  onSelect={() => onSelect(undefined)}
                  className="text-sm"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !currentArenaId ? "opacity-100" : "opacity-0"
                    )}
                  />
                  All Arenas
                </CommandItem>
                {arenas.map((arena) => (
                  <CommandItem
                    key={arena.id}
                    onSelect={() => onSelect(arena.id)}
                    className="text-sm"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        currentArenaId === arena.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {arena.name}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

