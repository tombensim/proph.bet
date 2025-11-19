"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
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
import { useRouter } from "next/navigation"
import { Arena, ArenaMembership } from "@prisma/client"

type MembershipWithArena = ArenaMembership & { arena: Arena }

interface ArenaSwitcherProps {
    memberships: MembershipWithArena[]
    currentArenaId?: string
}

export function ArenaSwitcher({ memberships, currentArenaId }: ArenaSwitcherProps) {
    const [open, setOpen] = React.useState(false)
    const router = useRouter()
    
    const currentArena = memberships.find(m => m.arenaId === currentArenaId)?.arena

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-[200px] justify-between mr-6">
                    {currentArena ? currentArena.name : "Select Arena"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder="Search arena..." />
                    <CommandList>
                        <CommandEmpty>No arena found.</CommandEmpty>
                        <CommandGroup heading="Arenas">
                            {memberships.map((membership) => (
                                <CommandItem
                                    key={membership.arena.id}
                                    onSelect={() => {
                                        router.push(`/arenas/${membership.arena.id}/markets`)
                                        setOpen(false)
                                    }}
                                    className="text-sm"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            currentArenaId === membership.arena.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {membership.arena.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

