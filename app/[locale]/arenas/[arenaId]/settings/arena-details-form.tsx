"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Arena } from "@prisma/client"
import { updateArenaDetailsAction } from "@/app/actions/arena-settings"
import { getUploadUrlAction } from "@/app/actions/storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Loader2, Upload, X } from "lucide-react"
import Image from "next/image"

const arenaDetailsSchema = z.object({
  id: z.string(),
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  coverImage: z.string().optional().nullable(),
})

type ArenaDetailsValues = z.infer<typeof arenaDetailsSchema>

export function ArenaDetailsForm({ arena }: { arena: Arena }) {
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)

  const form = useForm<ArenaDetailsValues>({
    resolver: zodResolver(arenaDetailsSchema),
    defaultValues: {
      id: arena.id,
      name: arena.name,
      description: arena.description || "",
      coverImage: arena.coverImage
    }
  })

  const coverImage = form.watch("coverImage")

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size too large. Max 5MB allowed.")
      return
    }

    setIsUploading(true)
    try {
      const { uploadUrl, publicUrl } = await getUploadUrlAction(file.type, "arenas")
      
      const res = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type }
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error("Upload response error:", res.status, res.statusText, errorText)
        throw new Error(`Upload failed: ${res.status} ${res.statusText}`)
      }

      form.setValue("coverImage", publicUrl, { shouldDirty: true })
      toast.success("Image uploaded successfully")
    } catch (error) {
      console.error("Upload failed:", error)
      toast.error("Failed to upload image")
    } finally {
      setIsUploading(false)
      e.target.value = ""
    }
  }

  function onSubmit(data: ArenaDetailsValues) {
    startTransition(async () => {
      try {
        await updateArenaDetailsAction(data)
        toast.success("Arena details updated successfully")
      } catch (error) {
        toast.error("Failed to update arena details")
        console.error(error)
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                    <FormLabel>Arena Name</FormLabel>
                    <FormControl>
                        <Input {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                        <Textarea {...field} />
                    </FormControl>
                    <FormDescription>Describe your arena to potential members.</FormDescription>
                    <FormMessage />
                </FormItem>
            )} />

            <FormField control={form.control} name="coverImage" render={({ field }) => (
                <FormItem>
                    <FormLabel>Cover Image</FormLabel>
                    <div className="space-y-4">
                        {field.value && (
                            <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-lg border bg-muted">
                                <Image
                                    src={field.value}
                                    alt="Arena cover"
                                    fill
                                    className="object-cover"
                                />
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute right-2 top-2 h-8 w-8"
                                    onClick={() => field.onChange(null)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        <div className="flex items-center gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isUploading}
                                onClick={() => document.getElementById("cover-upload")?.click()}
                            >
                                {isUploading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Upload className="mr-2 h-4 w-4" />
                                )}
                                Upload Image
                            </Button>
                            <Input
                                id="cover-upload"
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={isUploading}
                            />
                            <div className="text-sm text-muted-foreground">
                                Recommended size: 1200x630px (Max 5MB)
                            </div>
                        </div>
                    </div>
                    <FormMessage />
                </FormItem>
            )} />
        </div>

        <div className="flex justify-end">
            <Button type="submit" disabled={isPending || isUploading}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Details
            </Button>
        </div>
      </form>
    </Form>
  )
}

