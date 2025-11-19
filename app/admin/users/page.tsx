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
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const { users, total, pages } = await getAllUsers(page)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Users</h2>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Avatar</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Stats</TableHead>
              <TableHead className="text-right">Joined</TableHead>
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
                  <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  <div>{user._count.createdMarkets} markets</div>
                  <div>{user._count.bets} bets</div>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
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
                <Link href={`/admin/users?page=${page - 1}`}>
                    <Button variant="outline" size="sm">Previous</Button>
                </Link>
            ) : (
                <Button variant="outline" size="sm" disabled>Previous</Button>
            )}
            {page < pages ? (
                <Link href={`/admin/users?page=${page + 1}`}>
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

