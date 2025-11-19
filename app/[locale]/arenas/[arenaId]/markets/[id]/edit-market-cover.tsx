"use client"

import { useState, useTransition } from "react"
import { generateGradient } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Loader2, Pencil } from "lucide-react"
import { getUploadUrlAction } from "@/app/actions/storage"
import { updateMarketCoverAction } from "@/app/actions/update-market-cover"
import { toast } from "sonner"

interface EditMarketCoverProps {
  marketId: string
  initialImageUrl?: string
  marketTitle: string
  isCreator: boolean
}

export function EditMarketCover({ marketId, initialImageUrl, marketTitle, isCreator }: EditMarketCoverProps) {
  const [imageUrl, setImageUrl] = useState(initialImageUrl)
  const [isUploading, setIsUploading] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  // Determine effective image URL for display
  const displayUrl = imageUrl
  
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const { uploadUrl, publicUrl } = await getUploadUrlAction(file.type, "market-assets")
      
      const res = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type }
      })

      if (!res.ok) throw new Error("Upload failed")

      // Update state optimistically or just for display
      setImageUrl(publicUrl)

      // Save to DB
      startTransition(async () => {
        try {
            await updateMarketCoverAction(marketId, publicUrl)
            toast.success("Cover photo updated")
        } catch (err) {
            console.error(err)
            toast.error("Failed to update cover photo")
            setImageUrl(initialImageUrl) // Revert
        }
      })
      
    } catch (error) {
      console.error("Upload failed:", error)
      toast.error("Failed to upload image")
    } finally {
      setIsUploading(false)
      e.target.value = ""
    }
  }

  return (
    <div className="mb-6 rounded-xl overflow-hidden border bg-muted relative aspect-video group">
      {displayUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img 
          src={displayUrl} 
          alt={marketTitle} 
          className="object-cover w-full h-full"
        />
      ) : (
        <div 
          className="w-full h-full"
          style={{ background: generateGradient(marketId) }}
        />
      )}

      {isCreator && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
           <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  onChange={handleFileUpload}
                  disabled={isUploading || isPending}
                />
                <Button size="sm" variant="secondary" className="shadow-md" disabled={isUploading || isPending}>
                    {isUploading || isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin me-2" />
                    ) : (
                        <Pencil className="h-4 w-4 me-2" />
                    )}
                    Edit Cover
                </Button>
           </div>
        </div>
      )}
    </div>
  )
}

