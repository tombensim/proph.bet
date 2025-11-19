"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { unsubscribeAll } from "@/app/actions/unsubscribe"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function UnsubscribeButton({ uid, token }: { uid: string, token: string }) {
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const handleUnsubscribe = async () => {
        setLoading(true)
        try {
            await unsubscribeAll(uid, token)
            setSuccess(true)
            toast.success("Unsubscribed successfully")
        } catch (error) {
            toast.error("Failed to unsubscribe. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                <p className="font-medium">You have been unsubscribed.</p>
                <p className="text-sm mt-1">You can update your preferences anytime in your settings.</p>
            </div>
        )
    }

    return (
        <Button onClick={handleUnsubscribe} disabled={loading} variant="destructive" className="w-full sm:w-auto">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Unsubscribe
        </Button>
    )
}

