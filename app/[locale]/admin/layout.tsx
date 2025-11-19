import { auth } from "@/lib/auth"
import { Role } from "@prisma/client"
import { Link } from "@/lib/navigation"
import { redirect } from "next/navigation"
import { UserNav } from "@/components/layout/UserNav"
import { getTranslations } from 'next-intl/server';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const t = await getTranslations('Admin.nav');

  if (session?.user?.role !== Role.ADMIN) {
    redirect("/")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-muted/40">
         <div className="flex h-16 items-center px-4 container mx-auto gap-6">
            <Link href="/admin" className="text-lg font-bold">
              Admin Panel
            </Link>
            <nav className="flex gap-6 text-sm font-medium text-muted-foreground">
                <Link href="/admin" className="hover:text-foreground transition-colors">{t('overview')}</Link>
                <Link href="/admin/users" className="hover:text-foreground transition-colors">{t('users')}</Link>
                <Link href="/admin/arenas" className="hover:text-foreground transition-colors">{t('arenas')}</Link>
            </nav>
            <div className="ms-auto flex items-center gap-4">
                <Link href="/" className="text-sm hover:underline text-muted-foreground">
                    Back to App
                </Link>
                <UserNav user={session.user} />
            </div>
         </div>
      </header>
      <main className="flex-1 space-y-4 p-8 pt-6 container mx-auto">
        {children}
      </main>
    </div>
  )
}
