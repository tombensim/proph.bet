import { getSystemStats, getAnalyticsData } from "@/app/actions/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Trophy, Coins, Activity, LayoutGrid, Brain } from "lucide-react"
import { getTranslations } from 'next-intl/server';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default async function AdminDashboard() {
  const [stats, analytics] = await Promise.all([
    getSystemStats(),
    getAnalyticsData()
  ])
  const t = await getTranslations('Admin');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">{t('dashboard')}</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalUsers')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalArenas')}</CardTitle>
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalArenas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('activeMarkets')}</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMarkets}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalBets')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBets}</div>
            <p className="text-xs text-muted-foreground">
              {t('volume', { amount: stats.totalVolume.toLocaleString() })}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>{t('analytics.topArenas')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('analytics.table.arena')}</TableHead>
                  <TableHead className="text-right">{t('analytics.table.bets')}</TableHead>
                  <TableHead className="text-right">{t('analytics.table.volume')}</TableHead>
                  <TableHead className="text-right">AI Usage (User/Cron)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.arenaStats.map((arena) => (
                  <TableRow key={arena.id}>
                    <TableCell className="font-medium">{arena.name}</TableCell>
                    <TableCell className="text-right">{arena.totalBets}</TableCell>
                    <TableCell className="text-right">{arena.totalVolume.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                        <div className="flex flex-col items-end text-xs">
                            <span title="User Triggered">{arena.llm.user.count} req / {arena.llm.user.tokens} tok</span>
                            <span className="text-muted-foreground" title="Cron Automated">{arena.llm.cron.count} req / {arena.llm.cron.tokens} tok</span>
                        </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>{t('analytics.topUsers')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('analytics.table.user')}</TableHead>
                  <TableHead className="text-right">{t('analytics.table.bets')}</TableHead>
                  <TableHead className="text-right">{t('analytics.table.winnings')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.userStats.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="flex items-center gap-2 font-medium">
                       <Avatar className="h-8 w-8">
                        <AvatarImage src={user.image || ""} alt={user.name || ""} />
                        <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span>{user.name || "User"}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{user.totalBets}</TableCell>
                    <TableCell className="text-right">{user.totalWon.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
