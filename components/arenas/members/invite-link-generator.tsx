"use client"

import { useLocale } from "next-intl"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createPublicInviteAction, revokeInvitationAction } from "@/app/actions/manage-members"
import { toast } from "sonner"
import { Copy, Trash2, Link as LinkIcon, Loader2 } from "lucide-react"
import { Invitation } from "@prisma/client"
import { format } from "date-fns"

interface InviteLinkGeneratorProps {
  arenaId: string
  activeLinks: Invitation[]
}

export function InviteLinkGenerator({ arenaId, activeLinks }: InviteLinkGeneratorProps) {
  const locale = useLocale()
  const [loading, setLoading] = useState(false)
  const [expiresIn, setExpiresIn] = useState("168") // Default 7 days
  const [origin, setOrigin] = useState("")

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const hours = expiresIn === "never" ? null : parseInt(expiresIn)
      await createPublicInviteAction(arenaId, hours)
      toast.success("Invite link generated")
    } catch (error) {
      toast.error("Failed to generate link")
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async (id: string) => {
      try {
          await revokeInvitationAction(id)
          toast.success("Link revoked")
      } catch (error) {
          toast.error("Failed to revoke link")
      }
  }
  
  const copyLink = (token: string) => {
      const link = `${window.location.origin}/${locale}/invite/${token}`
      navigator.clipboard.writeText(link)
      toast.success("Link copied to clipboard")
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-end">
        <div className="w-[200px] space-y-2">
             <label className="text-sm font-medium">Expiration</label>
             <Select value={expiresIn} onValueChange={setExpiresIn}>
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="24">24 Hours</SelectItem>
                    <SelectItem value="168">7 Days</SelectItem>
                    <SelectItem value="720">30 Days</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                </SelectContent>
             </Select>
        </div>
        <Button onClick={handleGenerate} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LinkIcon className="w-4 h-4 mr-2" />}
            Generate Link
        </Button>
      </div>

      {activeLinks.length > 0 && (
          <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Active Links</h3>
              <div className="space-y-2">
                  {activeLinks.map(link => {
                      const inviteUrl = `${origin}/${locale}/invite/${link.token}`
                      return (
                        <div key={link.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                            <div className="space-y-1 flex-1 min-w-0 mr-4">
                                <div className="text-sm font-mono text-muted-foreground truncate bg-background p-1.5 rounded border">
                                    {inviteUrl}
                                </div>
                                <div className="text-xs text-muted-foreground px-1.5">
                                    Expires: {link.expiresAt.getFullYear() > 3000 ? "Never" : format(link.expiresAt, "PPP")}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="icon" variant="ghost" onClick={() => copyLink(link.token)}>
                                    <Copy className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleRevoke(link.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                      )
                  })}
              </div>
          </div>
      )}
    </div>
  )
}

