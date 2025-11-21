"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
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
import { getUsersAction } from "@/app/actions/get-users"
import { Badge } from "@/components/ui/badge"
import { useDebounce } from "@/lib/hooks/use-debounce"

// Define User type locally to avoid importing server types directly if not needed
type UserOption = {
  id: string
  name: string | null
  email: string
}

interface MultiUserSelectorProps {
  value?: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  arenaId?: string
  initialUsers?: UserOption[]
}

export function MultiUserSelector({ value = [], onChange, placeholder = "Select users...", arenaId, initialUsers = [] }: MultiUserSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [options, setOptions] = React.useState<UserOption[]>([])
  const [selectedUsers, setSelectedUsers] = React.useState<UserOption[]>(initialUsers)
  const debouncedQuery = useDebounce(query, 300)

  // Fetch users on search
  React.useEffect(() => {
    let active = true
    getUsersAction(debouncedQuery, arenaId).then((users) => {
      if (active) setOptions(users)
    })
    return () => { active = false }
  }, [debouncedQuery, arenaId])

  // Hydrate selected users from value if not present
  React.useEffect(() => {
    // Identify IDs that are in `value` but not in `selectedUsers`
    const missingIds = value.filter(id => !selectedUsers.some(u => u.id === id))

    if (missingIds.length > 0) {
      getUsersAction("", arenaId, missingIds).then((fetchedUsers) => {
        setSelectedUsers(prev => {
          const existingIds = new Set(prev.map(u => u.id))
          const newUsers = fetchedUsers.filter(u => !existingIds.has(u.id))
          if (newUsers.length === 0) return prev
          return [...prev, ...newUsers]
        })
      })
    } else if (value.length < selectedUsers.length) {
        // If value was reduced externally (though unlikely in this controlled component pattern without onChange), 
        // or if we want to sync 'selectedUsers' to be exactly 'value'.
        // But usually we keep the user objects even if deselected if we want cache, 
        // OR we should sync strictly.
        // Let's sync strictly to be safe: remove users not in value.
        setSelectedUsers(prev => prev.filter(u => value.includes(u.id)))
    }
  }, [value, arenaId]) // Removed selectedUsers from dep array to avoid loops, relying on functional state update or careful check

  const handleSelect = (user: UserOption) => {
    if (value.includes(user.id)) {
      onChange(value.filter((id) => id !== user.id))
      // State update will happen via useEffect if we rely on prop, but let's update optimistic too for speed
      // setSelectedUsers is handled by useEffect sync now to avoid double source of truth issues? 
      // No, usually better to update immediately for UI responsiveness.
      setSelectedUsers(prev => prev.filter(u => u.id !== user.id))
    } else {
      onChange([...value, user.id])
      setSelectedUsers(prev => [...prev, user])
    }
  }

  const handleRemove = (id: string) => {
    onChange(value.filter((v) => v !== id))
    setSelectedUsers(prev => prev.filter(u => u.id !== id))
  }

  return (
    <div className="space-y-2">
       <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-muted-foreground"
          >
            {value.length > 0 ? `${value.length} users selected` : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search colleagues..." onValueChange={setQuery} />
            <CommandList>
                <CommandEmpty>No users found.</CommandEmpty>
                <CommandGroup>
                {options.map((user) => (
                    <CommandItem
                    key={user.id}
                    value={user.id}
                    onSelect={() => handleSelect(user)}
                    >
                    <Check
                        className={cn(
                        "mr-2 h-4 w-4",
                        value.includes(user.id) ? "opacity-100" : "opacity-0"
                        )}
                    />
                    <div className="flex flex-col">
                        <span>{user.name || "Unknown"}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                    </CommandItem>
                ))}
                </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedUsers.map((user) => (
             <Badge key={user.id} variant="secondary" className="pr-1">
                {user.name || user.email}
                <button
                  type="button"
                  className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                  onClick={() => handleRemove(user.id)}
                >
                  <X className="h-3 w-3" />
                </button>
             </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
