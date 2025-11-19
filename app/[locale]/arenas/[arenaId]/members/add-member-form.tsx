"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addMemberAction } from "@/app/actions/manage-members"
import { Loader2, Plus } from "lucide-react"
import { useTranslations } from 'next-intl';

export function AddMemberForm({ arenaId }: { arenaId: string }) {
    const t = useTranslations('Members.addForm');
    const [email, setEmail] = useState("")
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(false)
        
        startTransition(async () => {
            try {
                await addMemberAction(email, arenaId)
                setSuccess(true)
                setEmail("")
            } catch (err) {
                setError(err instanceof Error ? err.message : t('error'))
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="grid w-full gap-1.5">
                <Label htmlFor="email">{t('email')}</Label>
                <Input 
                    id="email" 
                    type="email" 
                    placeholder={t('emailPlaceholder')} 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </div>
            <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 me-2" />}
                {t('submit')}
            </Button>
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
            {success && <p className="text-sm text-green-600 mt-2">{t('success')}</p>}
        </form>
    )
}
