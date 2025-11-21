"use client"

import { RefObject, useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import * as htmlToImage from 'html-to-image'
import { toast } from "sonner"

interface DownloadSummaryButtonProps {
  summaryRef: RefObject<HTMLDivElement | null>
  marketId: string
  className?: string
}

export function DownloadSummaryButton({ summaryRef, marketId, className }: DownloadSummaryButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleDownload = async () => {
    if (!summaryRef.current) return
    
    setIsExporting(true)
    try {
      // Wait a tiny bit to ensure rendering is complete
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Create a blob from the element
      const blob = await htmlToImage.toBlob(summaryRef.current, {
        quality: 1,
        pixelRatio: 2, // Higher resolution for crisp images
        backgroundColor: '#ffffff', // Force white background for clean export
        style: {
          padding: '32px', // Add padding around the content
        },
        filter: (node) => {
          // Exclude certain elements from export if needed
          return !node.classList?.contains('no-export')
        }
      })

      if (blob) {
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.download = `market-resolution-${marketId.slice(-6)}.png`
          link.href = url
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
          toast.success("Image downloaded successfully!")
      }
    } catch (error) {
      console.error("Failed to export image:", error)
      toast.error("Failed to generate image. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={handleDownload} 
      disabled={isExporting}
      className={className}
      title="Download Summary"
    >
      {isExporting ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          <span className="hidden sm:inline">Generating...</span>
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          <span className="ml-2 hidden sm:inline">Download Summary</span>
        </>
      )}
    </Button>
  )
}

