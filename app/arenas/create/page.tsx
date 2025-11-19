"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { createArenaAction } from "@/app/actions/create-arena"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

const createArenaSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  slug: z.string().min(3, "Slug must be at least 3 characters")
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
})

type FormValues = z.infer<typeof createArenaSchema>

export default function CreateArenaPage() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create arena")
      }
    })
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create New Arena</CardTitle>
          <CardDescription>
            Establish a new betting arena. You will be the administrator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="space-y-2">
              <Label>Arena Name</Label>
              <Input 
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
              <Label>Slug (URL)</Label>
              <Input 
                placeholder="engineering-team" 
                {...form.register("slug")} 
              />
              <p className="text-xs text-muted-foreground">Unique identifier for the URL.</p>
              {form.formState.errors.slug && (
                <p className="text-sm text-destructive">{form.formState.errors.slug.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                placeholder="What is this arena about?" 
                {...form.register("description")} 
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
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
        </CardContent>
      </Card>
    </div>
  )
}

