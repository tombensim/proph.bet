import { getArenaSettingsAction } from "@/app/actions/arena-settings"
import { ArenaSettingsForm } from "./settings-form"
import { notFound } from "next/navigation"

interface PageProps {
  params: Promise<{
    arenaId: string
  }>
}

export default async function ArenaSettingsPage(props: PageProps) {
  const params = await props.params;
  const {
    arenaId
  } = params;
  try {
      const settings = await getArenaSettingsAction(arenaId)
      
      return (
        <div className="container max-w-4xl py-6">
          <h1 className="text-3xl font-bold mb-6">Arena Settings</h1>
          <ArenaSettingsForm settings={settings} />
        </div>
      )
  } catch (error) {
      // Likely unauthorized
      return notFound()
  }
}

