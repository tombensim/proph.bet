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
}

export function MultiUserSelector({ value = [], onChange, placeholder = "Select users..." }: MultiUserSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [options, setOptions] = React.useState<UserOption[]>([])
  const [selectedUsers, setSelectedUsers] = React.useState<UserOption[]>([])
  const debouncedQuery = useDebounce(query, 300)

  // Fetch users on search
  React.useEffect(() => {
    let active = true
    getUsersAction(debouncedQuery).then((users) => {
      if (active) setOptions(users)
    })
    return () => { active = false }
  }, [debouncedQuery])

  // Fetch details for selected users if they are not in options
  React.useEffect(() => {
    // In a real app, you'd fetch specific IDs to show their names.
    // For this draft, we'll assume the user found them via search and we kept them.
    // If `value` comes from parent but we don't have the objects, we might show IDs or need a fetch-by-ids action.
    // For simplicity in V1 creation flow: we only set state from selection.
    // But we should sync `value` prop changes if they come from outside (e.g. form reset).
  }, [value])

  const handleSelect = (user: UserOption) => {
    if (value.includes(user.id)) {
      onChange(value.filter((id) => id !== user.id))
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

