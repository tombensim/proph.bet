import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Link } from "@/lib/navigation"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Trophy, TrendingUp, Coins } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getTranslations } from 'next-intl/server';

interface PageProps {
  params: Promise<{ arenaId: string; userId: string }>
}

export default async function UserProfilePage(props: PageProps) {
  const params = await props.params;
  const { arenaId, userId } = params
  const session = await auth()
  const t = await getTranslations('Profile');
  
  if (!session?.user?.id) redirect("/auth/signin")

  // Get target user details
  const targetUser = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!targetUser) notFound()

  // Get membership details
  const membership = await prisma.arenaMembership.findUnique({
    where: {
      userId_arenaId: {
        userId: userId,
        arenaId
      }
    }
  })

  if (!membership) notFound()

  // Get bets for this user in this arena
  const rawBets = await prisma.bet.findMany({
    where: {
      userId,
      market: {
        arenaId
      }
    },
    include: {
      market: {
        include: {
          options: true
        }
      },
      option: true
    },
    orderBy: { createdAt: 'desc' }
  })

  const bets = rawBets.map(bet => {
      let outcome = "PENDING"
      if (bet.market.status === "RESOLVED") {
          if (bet.market.winningOptionId) {
             if (bet.optionId === bet.market.winningOptionId) {
                 outcome = "WIN"
             } else {
                 outcome = "LOSS"
             }
          } else if (bet.market.winningValue !== null) {
             outcome = "RESOLVED" 
          } else {
             outcome = "LOSS" // Resolved but no winner?
          }
      } else if (bet.market.status === "CANCELLED") {
          outcome = "CANCELLED"
      }
      return { ...bet, outcome }
  })

  // Calculate stats
  const totalBets = bets.length
  const wins = bets.filter(b => b.outcome === "WIN").length
  const winRate = totalBets > 0 ? (wins / totalBets) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/arenas/${arenaId}/leaderboard`}>
          <ArrowLeft className="h-6 w-6 text-muted-foreground hover:text-foreground transition-colors" />
        </Link>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <Avatar className="h-16 w-16">
              <AvatarImage src={targetUser.image || ""} />
              <AvatarFallback>{targetUser.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <CardTitle>{targetUser.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{t('joined', { date: format(membership.joinedAt, 'MMM d, yyyy') })}</p>
            </div>
          </CardHeader>
          <CardContent>
             <div className="flex gap-2">
                <Badge variant={membership.role === 'ADMIN' ? "destructive" : "secondary"}>
                    {membership.role}
                </Badge>
             </div>
          </CardContent>
        </Card>

        <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium text-muted-foreground">{t('currentPoints')}</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-500" />
                <span className="text-2xl font-bold">{membership.points}</span>
             </div>
           </CardContent>
        </Card>

        <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium text-muted-foreground">{t('winRate')}</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-orange-500" />
                <span className="text-2xl font-bold">{winRate.toFixed(1)}%</span>
             </div>
             <p className="text-xs text-muted-foreground">{t('wins', { wins, total: totalBets })}</p>
           </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('history.title')}
        </h2>
        
        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('history.market')}</TableHead>
                        <TableHead>{t('history.prediction')}</TableHead>
                        <TableHead>{t('history.amount')}</TableHead>
                        <TableHead>{t('history.result')}</TableHead>
                        <TableHead className="text-end">{t('history.date')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {bets.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                {t('history.noBets')}
                            </TableCell>
                        </TableRow>
                    ) : (
                        bets.map(bet => (
                            <TableRow key={bet.id}>
                                <TableCell>
                                    <Link href={`/arenas/${arenaId}/markets/${bet.marketId}`} className="hover:underline">
                                        {bet.market.title}
                                    </Link>
                                </TableCell>
                                <TableCell>
                                    {bet.option?.text || bet.numericValue || "-"}
                                </TableCell>
                                <TableCell>{bet.amount}</TableCell>
                                <TableCell>
                                    {bet.outcome === "PENDING" && <Badge variant="outline">{t('history.pending')}</Badge>}
                                    {bet.outcome === "WIN" && <Badge className="bg-green-600 hover:bg-green-700">{t('history.win')}</Badge>}
                                    {bet.outcome === "LOSS" && <Badge variant="destructive">{t('history.loss')}</Badge>}
                                    {bet.outcome === "RESOLVED" && <Badge variant="secondary">{t('history.resolved')}</Badge>}
                                    {bet.outcome === "CANCELLED" && <Badge variant="secondary">Void</Badge>}
                                </TableCell>
                                <TableCell className="text-end text-muted-foreground">
                                    {format(bet.createdAt, "MMM d")}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </Card>
      </div>
    </div>
  )
}
