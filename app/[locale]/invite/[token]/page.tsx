import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { acceptInvitationAction } from "@/app/actions/accept-invitation"
import Link from "next/link"
import { CheckCircle2, XCircle } from "lucide-react"

export default async function InvitePage({ params }: { params: Promise<{ locale: string, token: string }> }) {
  const { token, locale } = await params
  const session = await auth()

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { 
        arena: true,
        inviter: true
    }
  })

  if (!invitation) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <CardTitle>Invalid Invitation</CardTitle>
                    <CardDescription>This invitation link is invalid or has expired.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <Button asChild>
                        <Link href={`/${locale}`}>Go Home</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
  }

  if (invitation.status !== 'PENDING' || invitation.expiresAt < new Date()) {
     return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <XCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <CardTitle>Invitation Expired</CardTitle>
                    <CardDescription>This invitation is no longer valid.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <Button asChild>
                        <Link href={`/${locale}`}>Go Home</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
  }

  const isLoggedIn = !!session?.user
  const isWrongUser = isLoggedIn && session.user.email?.toLowerCase() !== invitation.email.toLowerCase()

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <CardTitle>You're Invited!</CardTitle>
          <CardDescription>
             <strong>{invitation.inviter.name || "Someone"}</strong> invited you to join the <strong>{invitation.arena.name}</strong> arena.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           {isLoggedIn ? (
             isWrongUser ? (
                 <div className="text-center space-y-4">
                     <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                         You are logged in as <strong>{session.user.email}</strong>, but this invite was sent to <strong>{invitation.email}</strong>.
                     </div>
                     <div className="flex gap-2 justify-center">
                        <Button variant="outline" asChild>
                             <Link href="/api/auth/signout">Log out</Link>
                        </Button>
                     </div>
                 </div>
             ) : (
               <form action={acceptInvitationAction.bind(null, token)}>
                   <Button className="w-full" type="submit">
                       Accept Invitation
                   </Button>
               </form>
             )
           ) : (
             <div className="space-y-4 text-center">
                 <p className="text-sm text-muted-foreground">Please log in to accept this invitation.</p>
                 <Button asChild className="w-full">
                     <Link href={`/api/auth/signin?callbackUrl=/${locale}/invite/${token}`}>Log in / Sign up</Link>
                 </Button>
             </div>
           )}
        </CardContent>
      </Card>
    </div>
  )
}
