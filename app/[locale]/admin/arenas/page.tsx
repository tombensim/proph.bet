import { getAllArenas } from "@/app/actions/admin"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Link } from "@/lib/navigation"
import { Button } from "@/components/ui/button"
import { getTranslations } from 'next-intl/server';

export default async function ArenasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const { arenas, total, pages } = await getAllArenas(page)
  const t = await getTranslations('Admin.arenas');
  const tCommon = await getTranslations('Common');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
        <Link href="/arenas/create">
          <Button>{t('create')}</Button>
        </Link>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('table.name')}</TableHead>
              <TableHead>{t('table.slug')}</TableHead>
              <TableHead className="text-end">{t('table.members')}</TableHead>
              <TableHead className="text-end">{t('table.markets')}</TableHead>
              <TableHead className="text-end">{t('table.created')}</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {arenas.map((arena) => (
              <TableRow key={arena.id}>
                <TableCell className="font-medium">
                    <Link href={`/arenas/${arena.id}/markets`} className="hover:underline">
                        {arena.name}
                    </Link>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{arena.slug}</TableCell>
                <TableCell className="text-end">{arena._count.members}</TableCell>
                <TableCell className="text-end">{arena._count.markets}</TableCell>
                <TableCell className="text-end text-muted-foreground">
                  {new Date(arena.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                    <Link href={`/arenas/${arena.id}/markets`}>
                        <Button variant="ghost" size="sm">{tCommon('view')}</Button>
                    </Link>
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
                <Link href={`/admin/arenas?page=${page - 1}`}>
                    <Button variant="outline" size="sm">{tCommon('previous')}</Button>
                </Link>
            ) : (
                <Button variant="outline" size="sm" disabled>{tCommon('previous')}</Button>
            )}
            {page < pages ? (
                <Link href={`/admin/arenas?page=${page + 1}`}>
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
