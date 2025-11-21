import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Link } from "@/lib/navigation"
import { redirect } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Medal } from "lucide-react"
import { getTranslations } from 'next-intl/server';
import ReactMarkdown from "react-markdown"

interface PageProps {
  params: Promise<{ arenaId: string }>
}

export default async function LeaderboardPage(props: PageProps) {
  const session = await auth()
  const t = await getTranslations('Leaderboard');

  if (!session?.user) return redirect("/auth/signin")

  const { arenaId } = await props.params

  // Fetch Arena Details along with Memberships
  const arena = await prisma.arena.findUnique({
    where: { id: arenaId },
    include: {
        settings: true,
        members: {
            where: { hidden: false },
            include: { 
                user: {
                    include: {
                        bets: {
                            where: { market: { arenaId: arenaId } },
                            include: {
                                market: {
                                    select: {
                                        status: true,
                                        winningOptionId: true,
                                        winningValue: true
                                    }
                                }
                            }
                        },
                        createdMarkets: {
                            where: { arenaId: arenaId },
                            select: {
                                bets: {
                                    select: { amount: true }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { points: 'desc' },
            take: 50
        }
    }
  })

  if (!arena) return redirect("/")

  const memberships = arena.members
  const feePercent = (arena.settings?.tradingFeePercent ?? 0) / 100

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="h-5 w-5 text-yellow-500" />
      case 1: return <Medal className="h-5 w-5 text-gray-400" />
      case 2: return <Medal className="h-5 w-5 text-amber-700" />
      default: return <span className="font-mono text-muted-foreground">{index + 1}</span>
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
       <div className="text-center space-y-2">
         <h1 className="text-3xl font-bold">{t('title')}</h1>
         <p className="text-muted-foreground">{t('subtitle')}</p>
       </div>

       <div className="border rounded-lg">
         <Table>
           <TableHeader>
             <TableRow>
               <TableHead className="w-[80px] text-center">{t('table.rank')}</TableHead>
               <TableHead>{t('table.user')}</TableHead>
               <TableHead className="text-center">{t('table.record')}</TableHead>
               <TableHead className="text-center">{t('table.winRate')}</TableHead>
               <TableHead className="text-center">{t('table.created')}</TableHead>
               <TableHead className="text-center">{t('table.fees')}</TableHead>
               <TableHead className="text-end">{t('table.points')}</TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {memberships.map((member, index) => {
               const user = member.user
               
               // Stats Calculation
               const userBets = user.bets
               const wins = userBets.filter(b => 
                 b.market.status === 'RESOLVED' && 
                 b.market.winningOptionId && 
                 b.optionId === b.market.winningOptionId
               ).length
               
               const losses = userBets.filter(b => 
                 b.market.status === 'RESOLVED' && 
                 b.market.winningOptionId && 
                 b.optionId !== b.market.winningOptionId
               ).length

               const resolvedBets = wins + losses
               const winRate = resolvedBets > 0 ? Math.round((wins / resolvedBets) * 100) : 0
               
               const createdCount = user.createdMarkets.length
               const feesEarned = user.createdMarkets.reduce((total, market) => {
                 return total + market.bets.reduce((sum, bet) => sum + Math.floor(bet.amount * feePercent), 0)
               }, 0)

               return (
               <TableRow key={user.id}>
                 <TableCell className="font-medium text-center">
                   <div className="flex justify-center">
                     {getRankIcon(index)}
                   </div>
                 </TableCell>
                  <TableCell>
                    <Link 
                      href={`/arenas/${arenaId}/leaderboard/${user.id}`}
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.image || ""} />
                        <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
                      </Avatar>
                      <span className="group-hover:underline">{user.name}</span>
                      {user.id === session.user!.id && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{t('table.you')}</span>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {wins} - {losses}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {resolvedBets > 0 ? `${winRate}%` : '-'}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {createdCount}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm text-muted-foreground">
                    {feesEarned > 0 ? feesEarned.toLocaleString() : '-'}
                  </TableCell>
                 <TableCell className="text-end font-bold">
                   {member.points.toLocaleString()}
                 </TableCell>
               </TableRow>
             )})}
           </TableBody>
         </Table>
       </div>

       {/* About Section Moved Here */}
       {(arena.about || arena.description) && (
         <Card className="mt-12">
           <CardHeader>
             <CardTitle>About {arena.name}</CardTitle>
           </CardHeader>
           <CardContent>
             {arena.about ? (
               <article className="prose dark:prose-invert max-w-none">
                 <ReactMarkdown>{arena.about}</ReactMarkdown>
               </article>
             ) : (
               <p className="text-muted-foreground">{arena.description}</p>
             )}
           </CardContent>
         </Card>
       )}
    </div>
  )
}
