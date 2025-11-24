"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Arena } from "@prisma/client"
import { updateArenaDetailsAction } from "@/app/actions/arena-settings"
import { generateArenaAboutAction } from "@/app/actions/generate-description"
import { getUploadUrlAction } from "@/app/actions/storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Loader2, Upload, X, Sparkles } from "lucide-react"
import Image from "next/image"

const arenaDetailsSchema = z.object({
  id: z.string(),
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  about: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
  logo: z.string().optional().nullable(),
})

type ArenaDetailsValues = z.infer<typeof arenaDetailsSchema>

export function ArenaDetailsForm({ arena }: { arena: Arena }) {
  const [isPending, startTransition] = useTransition()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const form = useForm<ArenaDetailsValues>({
    resolver: zodResolver(arenaDetailsSchema),
    defaultValues: {
      id: arena.id,
      name: arena.name,
      description: arena.description || "",
      about: arena.about || "",
      coverImage: arena.coverImage,
      logo: arena.logo
    }
  })

  const coverImage = form.watch("coverImage")
  const logo = form.watch("logo")

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, fieldName: "coverImage" | "logo") {
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

      form.setValue(fieldName, publicUrl, { shouldDirty: true })
      toast.success("Image uploaded successfully")
    } catch (error) {
      console.error("Upload failed:", error)
      toast.error("Failed to upload image")
    } finally {
      setIsUploading(false)
      e.target.value = ""
    }
  }

  async function generateAbout() {
    const name = form.getValues("name")
    const description = form.getValues("description")
    
    setIsGenerating(true)
    try {
      const result = await generateArenaAboutAction({
        arenaId: arena.id,
        name,
        description
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      if (result.about) {
        form.setValue("about", result.about, { shouldDirty: true })
        toast.success("Content generated successfully")
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to generate content")
    } finally {
      setIsGenerating(false)
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
                    <FormLabel>Short Description</FormLabel>
                    <FormControl>
                        <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormDescription>A brief summary shown on cards.</FormDescription>
                    <FormMessage />
                </FormItem>
            )} />

            <FormField control={form.control} name="about" render={({ field }) => (
                <FormItem>
                    <div className="flex items-center justify-between">
                        <FormLabel>About Page Content (Markdown)</FormLabel>
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 gap-2 text-muted-foreground"
                            onClick={generateAbout}
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Sparkles className="h-4 w-4" />
                            )}
                            Generate with AI
                        </Button>
                    </div>
                    <FormControl>
                        <Textarea 
                            {...field} 
                            value={field.value || ""} 
                            rows={10} 
                            className="font-mono text-sm" 
                        />
                    </FormControl>
                    <FormDescription>Rich text content for your arena's About page.</FormDescription>
                    <FormMessage />
                </FormItem>
            )} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="logo" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Logo</FormLabel>
                        <div className="space-y-4">
                            {field.value && (
                                <div className="relative h-32 w-32 overflow-hidden rounded-lg border bg-muted">
                                    <Image
                                        src={field.value}
                                        alt="Arena logo"
                                        fill
                                        className="object-contain p-2"
                                        unoptimized={field.value.includes('localhost')}
                                    />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute right-2 top-2 h-6 w-6"
                                        onClick={() => field.onChange(null)}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                            <div className="flex items-center gap-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={isUploading}
                                    onClick={() => document.getElementById("logo-upload")?.click()}
                                >
                                    {isUploading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Upload className="mr-2 h-4 w-4" />
                                    )}
                                    Upload Logo
                                </Button>
                                <Input
                                    id="logo-upload"
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleFileUpload(e, "logo")}
                                    disabled={isUploading}
                                />
                            </div>
                            <FormDescription>Square image recommended. (Max 5MB)</FormDescription>
                        </div>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField control={form.control} name="coverImage" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Cover Image</FormLabel>
                        <div className="space-y-4">
                            {field.value && (
                                <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
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
                                    Upload Cover
                                </Button>
                                <Input
                                    id="cover-upload"
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleFileUpload(e, "coverImage")}
                                    disabled={isUploading}
                                />
                            </div>
                            <FormDescription>Recommended size: 1200x630px (Max 5MB)</FormDescription>
                        </div>
                        <FormMessage />
                    </FormItem>
                )} />
            </div>
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
