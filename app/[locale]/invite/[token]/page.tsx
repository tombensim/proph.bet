import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { acceptInvitationAction } from "@/app/actions/accept-invitation"
import Link from "next/link"
import { CheckCircle2, XCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

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
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <XCircle className="w-12 h-12 text-destructive" />
                    </div>
                    <CardTitle>Invalid Invitation</CardTitle>
                    <CardDescription>This invitation link is invalid or has expired.</CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-center">
                    <Button asChild variant="secondary">
                        <Link href={`/${locale}`}>Go Home</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
  }

  const isUnlimited = invitation.usageLimit === null
  const isLimitReached = !isUnlimited && invitation.usageCount >= invitation.usageLimit!
  const isExpired = invitation.expiresAt < new Date()
  const isInvalidStatus = invitation.status !== 'PENDING'

  if (isInvalidStatus || isExpired || isLimitReached) {
     return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                         <XCircle className="w-12 h-12 text-amber-500" />
                    </div>
                    <CardTitle>Invitation Expired</CardTitle>
                    <CardDescription>
                        {isLimitReached ? "This invitation has reached its usage limit." : "This invitation is no longer valid."}
                    </CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-center">
                    <Button asChild variant="secondary">
                        <Link href={`/${locale}`}>Go Home</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
  }

  const isLoggedIn = !!session?.user
  const isWrongUser = isLoggedIn && invitation.email && session.user.email?.toLowerCase() !== invitation.email.toLowerCase()

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md overflow-hidden">
        {invitation.arena.coverImage && (
            <div className="h-32 w-full relative">
                <img 
                    src={invitation.arena.coverImage} 
                    alt={invitation.arena.name}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
        )}
        
        <CardHeader className="text-center relative z-10">
          {!invitation.arena.coverImage && (
              <div className="flex justify-center mb-4">
                  <CheckCircle2 className="w-12 h-12 text-primary" />
              </div>
          )}
          
          <CardTitle className="text-2xl">{invitation.arena.name}</CardTitle>
          {invitation.arena.description && (
              <CardDescription className="line-clamp-2 mt-2">
                  {invitation.arena.description}
              </CardDescription>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6">
           <div className="flex items-center justify-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Avatar className="h-10 w-10 border-2 border-background">
                    <AvatarImage src={invitation.inviter.image || ""} />
                    <AvatarFallback>{invitation.inviter.name?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <div className="text-sm text-left">
                    <p className="font-medium text-foreground">{invitation.inviter.name || "Someone"}</p>
                    <p className="text-muted-foreground">invited you to join</p>
                </div>
           </div>

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
                   <Button className="w-full" size="lg" type="submit">
                       Accept Invitation
                   </Button>
               </form>
             )
           ) : (
             <div className="space-y-4 text-center">
                 <p className="text-sm text-muted-foreground">Please log in to accept this invitation.</p>
                 <Button asChild className="w-full" size="lg">
                     <Link href={`/auth/signin?callbackUrl=/${locale}/invite/${token}`}>Log in / Sign up</Link>
                 </Button>
             </div>
           )}
        </CardContent>
      </Card>
    </div>
  )
}
