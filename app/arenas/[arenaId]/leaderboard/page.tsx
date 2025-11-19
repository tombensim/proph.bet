import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
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
import { Trophy, Medal } from "lucide-react"

interface PageProps {
  params: Promise<{ arenaId: string }>
}

export default async function LeaderboardPage(props: PageProps) {
  const session = await auth()
  if (!session?.user) return redirect("/api/auth/signin")

  const { arenaId } = await props.params

  const memberships = await prisma.arenaMembership.findMany({
    where: { arenaId },
    include: { user: true },
    orderBy: { points: 'desc' },
    take: 50
  })

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
         <h1 className="text-3xl font-bold">Arena Leaderboard</h1>
         <p className="text-muted-foreground">Who is leading the prediction race in this arena?</p>
       </div>

       <div className="border rounded-lg">
         <Table>
           <TableHeader>
             <TableRow>
               <TableHead className="w-[80px] text-center">Rank</TableHead>
               <TableHead>User</TableHead>
               <TableHead className="text-right">Points</TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {memberships.map((member, index) => {
               const user = member.user
               return (
               <TableRow key={user.id}>
                 <TableCell className="font-medium text-center">
                   <div className="flex justify-center">
                     {getRankIcon(index)}
                   </div>
                 </TableCell>
                 <TableCell>
                   <div className="flex items-center gap-3">
                     <Avatar className="h-8 w-8">
                       <AvatarImage src={user.image || ""} />
                       <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
                     </Avatar>
                     <span>{user.name}</span>
                     {user.id === session.user!.id && (
                       <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">You</span>
                     )}
                   </div>
                 </TableCell>
                 <TableCell className="text-right font-bold">
                   {member.points.toLocaleString()}
                 </TableCell>
               </TableRow>
             )})}
           </TableBody>
         </Table>
       </div>
    </div>
  )
}
