"use client"

import { Button } from "@/components/ui/button"
import { Share2, Check, Copy } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { useTranslations } from 'next-intl';

interface ShareMarketButtonProps {
  marketTitle: string
  url?: string
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function ShareMarketButton({ 
  marketTitle, 
  url, 
  variant = "outline",
  size = "sm",
  className
}: ShareMarketButtonProps) {
  const [copied, setCopied] = useState(false)
  
  const handleShare = async () => {
    let shareUrl = url || window.location.href
    if (shareUrl.startsWith('/')) {
        shareUrl = `${window.location.origin}${shareUrl}`
    }
    
    // Simple mobile detection
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

    // Only use native share on mobile devices
    if (isMobile && navigator.share) {
      try {
        await navigator.share({
          title: marketTitle,
          text: `Check out this market: ${marketTitle}`,
          url: shareUrl,
        })
      } catch (error) {
        // User cancelled or failed
        console.error("Error sharing:", error)
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        toast.success("Link copied to clipboard")
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        toast.error("Failed to copy link")
      }
    }
  }

  const showText = size !== "icon"

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={handleShare}
      className={className}
    >
      {copied ? (
        <Check className={`h-4 w-4 ${showText ? "mr-2" : ""}`} />
      ) : (
        <Share2 className={`h-4 w-4 ${showText ? "mr-2" : ""}`} />
      )}
      {showText && (copied ? "Copied" : "Share")}
    </Button>
  )
}
