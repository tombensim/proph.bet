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
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function ArenasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const { arenas, total, pages } = await getAllArenas(page)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Arenas</h2>
        <Link href="/arenas/create">
          <Button>Create Arena</Button>
        </Link>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">Members</TableHead>
              <TableHead className="text-right">Markets</TableHead>
              <TableHead className="text-right">Created</TableHead>
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
                <TableCell className="text-right">{arena._count.members}</TableCell>
                <TableCell className="text-right">{arena._count.markets}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {new Date(arena.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                    <Link href={`/arenas/${arena.id}/markets`}>
                        <Button variant="ghost" size="sm">View</Button>
                    </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2">
        <div className="text-sm text-muted-foreground">
            Page {page} of {pages}
        </div>
        <div className="space-x-2">
            {page > 1 ? (
                <Link href={`/admin/arenas?page=${page - 1}`}>
                    <Button variant="outline" size="sm">Previous</Button>
                </Link>
            ) : (
                <Button variant="outline" size="sm" disabled>Previous</Button>
            )}
            {page < pages ? (
                <Link href={`/admin/arenas?page=${page + 1}`}>
                    <Button variant="outline" size="sm">Next</Button>
                </Link>
            ) : (
                <Button variant="outline" size="sm" disabled>Next</Button>
            )}
        </div>
      </div>
    </div>
  )
}

