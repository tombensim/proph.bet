"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createArenaAction } from "@/app/actions/create-arena"
import { Loader2 } from "lucide-react"

const createArenaSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  slug: z.string().min(3, "Slug must be at least 3 characters")
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
})

type FormValues = z.infer<typeof createArenaSchema>

interface CreateArenaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateArenaDialog({ open, onOpenChange }: CreateArenaDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(createArenaSchema),
    defaultValues: {
      name: "",
      description: "",
      slug: ""
    }
  })

  function onSubmit(data: FormValues) {
    setError(null)
    startTransition(async () => {
      try {
        await createArenaAction(data)
        onOpenChange(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create arena")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Arena</DialogTitle>
          <DialogDescription>
            Establish a new betting arena. You will be the administrator.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Arena Name</Label>
            <Input 
              id="name"
              placeholder="e.g. Engineering Team" 
              {...form.register("name")} 
              onChange={(e) => {
                  form.setValue("name", e.target.value)
                  if (!form.getValues("slug")) {
                      form.setValue("slug", e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"))
                  }
              }}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input 
              id="slug"
              placeholder="engineering-team" 
              {...form.register("slug")} 
            />
            <p className="text-xs text-muted-foreground">Unique identifier for the URL.</p>
            {form.formState.errors.slug && (
              <p className="text-sm text-destructive">{form.formState.errors.slug.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description"
              placeholder="What is this arena about?" 
              {...form.register("description")} 
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
              {isPending ? (
                  <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                  </>
              ) : (
                  "Create Arena"
              )}
              </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

