"use client"

import { useState, useTransition } from "react"
import { Market, Option } from "@prisma/client"
import { resolveMarketAction } from "@/app/actions/resolve-market"
import { syncPolymarketResolutionAction } from "@/app/actions/sync-polymarket-resolution"
import { getUploadUrlAction } from "@/app/actions/storage"
import { Button, buttonVariants } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Loader2, Upload, FileCheck, RefreshCw, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from 'next-intl';
import Image from "next/image"
import { toast } from "sonner"

interface ResolveMarketFormProps {
  market: Market & { options: Option[] }
}

export function ResolveMarketForm({ market }: ResolveMarketFormProps) {
  const t = useTranslations('MarketDetail.resolveForm');
  const [isPending, startTransition] = useTransition()
  const [isSyncing, setIsSyncing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [winningOptionId, setWinningOptionId] = useState<string>("")
  const [winningValue, setWinningValue] = useState<string>("")
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  
  const isPolymarket = market.source === "POLYMARKET"
  
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    console.log("File selected")
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      // 1. Get Presigned URL
      const { uploadUrl, publicUrl } = await getUploadUrlAction(file.type)
      
      // 2. Upload to S3 (MinIO)
      const res = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type }
      })

      if (!res.ok) throw new Error("Upload failed status: " + res.status)

      setUploadedUrl(publicUrl)
    } catch (error) {
      console.error("Upload failed:", error)
      alert("Failed to upload evidence. Check console for details.")
    } finally {
      setIsUploading(false)
      // Clear value to allow re-upload if needed
      e.target.value = "" 
    }
  }

  async function onSyncFromPolymarket() {
    setIsSyncing(true)
    try {
      const result = await syncPolymarketResolutionAction(market.id)
      if (result.success) {
        toast.success(result.message)
        // The page will refresh automatically due to revalidation
        setTimeout(() => window.location.reload(), 1500)
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error("Sync error:", error)
      toast.error("Failed to sync resolution from Polymarket")
    } finally {
      setIsSyncing(false)
    }
  }

  function onResolve() {
    if (!confirm("Are you sure? This cannot be undone.")) return

    startTransition(async () => {
      try {
        await resolveMarketAction({
          marketId: market.id,
          winningOptionId: winningOptionId || undefined,
          winningValue: winningValue ? parseFloat(winningValue) : undefined,
          resolutionImage: uploadedUrl || undefined
        })
      } catch (error) {
        alert("Failed to resolve")
        console.error(error)
      }
    })
  }

  return (
    <Card className="border-orange-200 bg-orange-50/50 relative overflow-hidden">
      <div className="absolute -right-4 -top-4 w-24 h-24 opacity-20 rotate-12 pointer-events-none">
        <Image 
          src="/chami-judge.png" 
          alt="Judge" 
          fill 
          className="object-contain"
        />
      </div>
      <CardHeader>
        <CardTitle className="text-orange-700 flex items-center gap-2">
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('desc')}</p>
        
        {isPolymarket && (
          <div className="space-y-3 pb-4 border-b">
            <div className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <ExternalLink className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-purple-900 mb-1">{t('polymarketIntegration')}</p>
                <p className="text-purple-700 text-xs">
                  {t('polymarketSyncDesc')}
                </p>
              </div>
            </div>
            <Button 
              onClick={onSyncFromPolymarket}
              disabled={isSyncing || isPending}
              variant="outline"
              className="w-full border-purple-200 hover:bg-purple-50 hover:text-purple-700"
            >
              {isSyncing && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {!isSyncing && <RefreshCw className="me-2 h-4 w-4" />}
              {t('syncFromPolymarket')}
            </Button>
          </div>
        )}
        
        {(market.type === "BINARY" || market.type === "MULTIPLE_CHOICE") && (
           <div className="space-y-2">
             <Label>{t('winningOption')}</Label>
             <Select onValueChange={setWinningOptionId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectWinner')} />
                </SelectTrigger>
                <SelectContent>
                  {market.options.map(opt => (
                    <SelectItem key={opt.id} value={opt.id}>{opt.text}</SelectItem>
                  ))}
                </SelectContent>
             </Select>
           </div>
        )}

        {market.type === "NUMERIC_RANGE" && (
           <div className="space-y-2">
             <Label>{t('winningValue')}</Label>
             <Input 
               type="number" 
               onChange={(e) => setWinningValue(e.target.value)} 
               placeholder={t('enterExactValue')}
             />
           </div>
        )}

        <div className="space-y-2">
          <Label>{t('evidence')}</Label>
          <div className="flex flex-col gap-2">
            {/* Plain file input for maximum reliability. Once confirmed working, we can restyle. */}
            <Input
              id="evidence-upload"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isUploading || !!uploadedUrl}
            />

            {isUploading && (
              <span className="inline-flex items-center text-xs text-muted-foreground">
                <Loader2 className="me-1 h-3 w-3 animate-spin" />
                {t('uploading')}
              </span>
            )}

            {uploadedUrl && (
              <span className="text-xs text-green-600 font-medium">{t('evidenceAttached')}</span>
            )}
          </div>
        </div>

        <Button 
          onClick={onResolve} 
          disabled={isPending || (!winningOptionId && !winningValue) || isUploading}
          variant="destructive"
          className="w-full"
        >
          {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {t('finalize')}
        </Button>
      </CardContent>
    </Card>
  )
}
