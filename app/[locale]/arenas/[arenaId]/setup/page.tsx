import { getArenaSettingsAction } from "@/app/actions/arena-settings"
import { ArenaSetupWizard } from "./setup-wizard"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

interface PageProps {
  params: Promise<{
    arenaId: string
  }>
}

export default async function ArenaSetupPage(props: PageProps) {
  const params = await props.params;
  const {
    arenaId
  } = params;
  const session = await auth()

  try {
      // Verify access first
      const membership = await prisma.arenaMembership.findUnique({
        where: { userId_arenaId: { userId: session?.user?.id!, arenaId } }
      })
      
      // Only allow if admin
      if (membership?.role !== "ADMIN" && session?.user?.role !== "ADMIN" && session?.user?.role !== "GLOBAL_ADMIN") {
        return notFound()
      }

      const settings = await getArenaSettingsAction(arenaId)
      
      return (
        <div className="container max-w-3xl py-12">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Welcome to your new Arena!</h1>
            <p className="text-muted-foreground">Let's get everything set up just the way you like it.</p>
          </div>
          <ArenaSetupWizard settings={settings} arenaId={arenaId} />
        </div>
      )
  } catch (error) {
      return notFound()
  }
}

