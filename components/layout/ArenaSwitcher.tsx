"use client"

import * as React from "react"
import { Check, ChevronRight, ChevronsUpDown, PlusCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useRouter } from "@/lib/navigation"
import { Arena, ArenaMembership } from "@prisma/client"
import { CreateArenaDialog } from "@/components/arenas/create-arena-dialog"

type MembershipWithArena = ArenaMembership & { arena: Arena }

interface ArenaSwitcherProps {
    memberships: MembershipWithArena[]
    currentArenaId?: string
    canCreate?: boolean
}

export function ArenaSwitcher({ memberships, currentArenaId, canCreate }: ArenaSwitcherProps) {
    const [open, setOpen] = React.useState(false)
    const [showCreateDialog, setShowCreateDialog] = React.useState(false)
    const [showArchived, setShowArchived] = React.useState(false)
    const router = useRouter()
    
    const currentArena = memberships.find(m => m.arenaId === currentArenaId)?.arena

    const activeArenas = memberships.filter(m => !m.arena.archivedAt)
    const archivedArenas = memberships.filter(m => m.arena.archivedAt)

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={open} className="w-[110px] md:w-[200px] justify-between me-1 md:me-6 px-1.5 md:px-4 text-xs md:text-sm">
                        <span className="truncate">{currentArena ? currentArena.name : "Select Arena"}</span>
                        <ChevronsUpDown className="ms-1 md:ms-2 h-3.5 w-3.5 md:h-4 md:w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                    <Command>
                        <CommandInput placeholder="Search arena..." />
                        <CommandList>
                            <CommandEmpty>No arena found.</CommandEmpty>
                            <CommandGroup heading="Arenas">
                                {activeArenas.map((membership) => (
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
                                                "me-2 h-4 w-4",
                                                currentArenaId === membership.arena.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {membership.arena.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                            {archivedArenas.length > 0 && (
                                <>
                                    <CommandSeparator />
                                    <CommandGroup>
                                        <CommandItem
                                            onSelect={() => setShowArchived(!showArchived)}
                                            className="text-sm text-muted-foreground cursor-pointer"
                                        >
                                            <ChevronRight
                                                className={cn(
                                                    "me-2 h-4 w-4 transition-transform",
                                                    showArchived && "rotate-90"
                                                )}
                                            />
                                            Archived ({archivedArenas.length})
                                        </CommandItem>
                                        {showArchived && archivedArenas.map((membership) => (
                                            <CommandItem
                                                key={membership.arena.id}
                                                onSelect={() => {
                                                    router.push(`/arenas/${membership.arena.id}/markets`)
                                                    setOpen(false)
                                                }}
                                                className="text-sm text-muted-foreground pl-8"
                                            >
                                                <Check
                                                    className={cn(
                                                        "me-2 h-4 w-4",
                                                        currentArenaId === membership.arena.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {membership.arena.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </>
                            )}
                            {canCreate && (
                                <>
                                    <CommandSeparator />
                                    <CommandGroup>
                                        <CommandItem
                                            onSelect={() => {
                                                setOpen(false)
                                                setShowCreateDialog(true)
                                            }}
                                            className="text-sm"
                                        >
                                            <PlusCircle className="me-2 h-4 w-4" />
                                            Create Arena
                                        </CommandItem>
                                    </CommandGroup>
                                </>
                            )}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            <CreateArenaDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
        </>
    )
}

