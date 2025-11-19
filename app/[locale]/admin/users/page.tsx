import { getAllUsers } from "@/app/actions/admin"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Link } from "@/lib/navigation"
import { Button } from "@/components/ui/button"
import { UserRoleSelect } from "./user-role-select"
import { getTranslations } from 'next-intl/server';

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const { users, total, pages } = await getAllUsers(page)
  const t = await getTranslations('Admin.users');
  const tCommon = await getTranslations('Common');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">{t('table.avatar')}</TableHead>
              <TableHead>{t('table.name')}</TableHead>
              <TableHead>{t('table.email')}</TableHead>
              <TableHead>{t('table.role')}</TableHead>
              <TableHead className="text-end">{t('table.stats')}</TableHead>
              <TableHead className="text-end">{t('table.joined')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image || ""} />
                    <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <UserRoleSelect userId={user.id} currentRole={user.role} />
                </TableCell>
                <TableCell className="text-end text-sm text-muted-foreground">
                  <div>{t('stats.markets', { count: user._count.createdMarkets })}</div>
                  <div>{t('stats.bets', { count: user._count.bets })}</div>
                </TableCell>
                <TableCell className="text-end text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2">
        <div className="text-sm text-muted-foreground">
            {tCommon('page', { current: page, total: pages })}
        </div>
        <div className="space-x-2">
            {page > 1 ? (
                <Link href={`/admin/users?page=${page - 1}`}>
                    <Button variant="outline" size="sm">{tCommon('previous')}</Button>
                </Link>
            ) : (
                <Button variant="outline" size="sm" disabled>{tCommon('previous')}</Button>
            )}
            {page < pages ? (
                <Link href={`/admin/users?page=${page + 1}`}>
                    <Button variant="outline" size="sm">{tCommon('next')}</Button>
                </Link>
            ) : (
                <Button variant="outline" size="sm" disabled>{tCommon('next')}</Button>
            )}
        </div>
      </div>
    </div>
  )
}
