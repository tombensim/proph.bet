"use client"

import { useState, useTransition } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Upload } from "lucide-react"
import { getUploadUrlAction } from "@/app/actions/storage"
import { updateProfileImage } from "@/app/actions/user"
import { useRouter } from "@/lib/navigation"

interface ProfileFormProps {
  user: {
    id: string
    name: string | null
    image: string | null
  }
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(user.image)
  
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size too large. Max 5MB allowed.")
      return
    }

    setIsUploading(true)
    try {
      // 1. Get Presigned URL
      const { uploadUrl, publicUrl } = await getUploadUrlAction(file.type, "avatars")
      
      // 2. Upload to S3
      const res = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type }
      })

      if (!res.ok) throw new Error("Upload failed status: " + res.status)

      // 3. Update User Profile
      startTransition(async () => {
        const result = await updateProfileImage(publicUrl)
        if (result.error) {
          alert(result.error)
        } else {
          setUploadedUrl(publicUrl)
          router.refresh()
        }
      })
    } catch (error) {
      console.error("Upload failed:", error)
      alert("Failed to upload image. Please try again.")
    } finally {
      setIsUploading(false)
      // Clear the input
      e.target.value = ""
    }
  }

  return (
    <div className="space-y-4">
      <Label>Profile Image</Label>
      <div className="flex items-center gap-6">
        <Avatar className="h-20 w-20 border-2 border-muted">
          <AvatarImage src={uploadedUrl || ""} />
          <AvatarFallback className="text-xl">
            {user.name?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="relative overflow-hidden"
              disabled={isUploading || isPending}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Change Image
                </>
              )}
              <Input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                accept="image/png, image/jpeg, image/webp, image/gif"
                onChange={handleImageUpload}
                disabled={isUploading || isPending}
              />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Recommended: Square image, max 5MB.
          </p>
        </div>
      </div>
    </div>
  )
}

