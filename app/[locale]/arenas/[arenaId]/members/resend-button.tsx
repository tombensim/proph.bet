"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { resendInvitationAction } from "@/app/actions/resend-invitation"
import { Loader2, Send } from "lucide-react"
import { toast } from "sonner"

export function ResendButton({ invitationId }: { invitationId: string }) {
    const [isPending, startTransition] = useTransition()

    const handleResend = () => {
        startTransition(async () => {
            try {
                await resendInvitationAction(invitationId)
                toast.success("Invitation Resent", {
                    description: "The invitation email has been sent successfully.",
                })
            } catch (error) {
                toast.error("Error", {
                    description: error instanceof Error ? error.message : "Failed to resend invitation",
                })
            }
        })
    }

    return (
        <Button 
            variant="outline" 
            size="sm" 
            onClick={handleResend} 
            disabled={isPending}
            title="Resend Invitation"
        >
            {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <>
                    <Send className="h-3 w-3 mr-2" />
                    Resend
                </>
            )}
        </Button>
    )
}

