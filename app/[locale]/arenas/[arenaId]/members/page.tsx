import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { AddMemberForm } from "./add-member-form"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ResendButton } from "./resend-button"
import { getTranslations } from 'next-intl/server';

interface PageProps {
    params: Promise<{ arenaId: string }>
}

export default async function MembersPage(props: PageProps) {
    const session = await auth()
    const t = await getTranslations('Members');
    const tCommon = await getTranslations('Common');
    
    if (!session?.user) return redirect("/api/auth/signin")
    
    const { arenaId } = await props.params
    
    // Check if admin
    const membership = await prisma.arenaMembership.findUnique({
        where: { userId_arenaId: { userId: session.user.id, arenaId } }
    })
    
    if (membership?.role !== "ADMIN") {
        return (
            <div className="container mx-auto py-12 text-center">
                <h1 className="text-2xl font-bold text-destructive">Unauthorized</h1>
                <p className="text-muted-foreground">Only arena administrators can manage members.</p>
            </div>
        )
    }
    
    const members = await prisma.arenaMembership.findMany({
        where: { arenaId },
        include: { user: true },
        orderBy: { joinedAt: 'desc' }
    })
    
    const pendingInvitations = await prisma.invitation.findMany({
        where: { 
            arenaId,
            status: 'PENDING'
        },
        orderBy: { createdAt: 'desc' }
    })
    
    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">{t('title')}</h1>
            </div>
            
            <div className="p-6 border rounded-lg bg-card">
                <h2 className="text-lg font-semibold mb-4">{t('addForm.title')}</h2>
                <AddMemberForm arenaId={arenaId} />
            </div>
            
            <div className="border rounded-lg bg-card">
                 <div className="p-4 border-b bg-muted/40 font-medium">
                     {members.length} {t('table.member')}{members.length !== 1 ? 's' : ''} {pendingInvitations.length > 0 && `(+${pendingInvitations.length} Pending)`}
                 </div>
                 
                 {/* Active Members */}
                 {members.map(m => (
                     <div key={m.id} className="flex items-center justify-between p-4 border-b last:border-0">
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={m.user.image || ""} />
                                <AvatarFallback>{m.user.name?.[0] || "U"}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium">{m.user.name || "Unknown"}</p>
                                <p className="text-sm text-muted-foreground">{m.user.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-muted-foreground font-mono">
                                {m.points} {tCommon('points')}
                            </div>
                            <Badge variant={m.role === "ADMIN" ? "default" : "secondary"}>
                                {m.role}
                            </Badge>
                        </div>
                     </div>
                 ))}

                 {/* Pending Invitations */}
                 {pendingInvitations.map(invite => (
                     <div key={invite.id} className="flex items-center justify-between p-4 border-b last:border-0 bg-amber-50/30">
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarFallback className="bg-amber-100 text-amber-600">?</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium italic text-muted-foreground">Pending Acceptance</p>
                                <p className="text-sm text-muted-foreground">{invite.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                                PENDING
                            </Badge>
                            <ResendButton invitationId={invite.id} />
                        </div>
                     </div>
                 ))}
            </div>
        </div>
    )
}
