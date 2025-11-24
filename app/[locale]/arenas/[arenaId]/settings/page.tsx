import { getArenaSettingsAction, getArenaDetailsAction } from "@/app/actions/arena-settings"
import { ArenaSettingsForm } from "./settings-form"
import { ArenaDetailsForm } from "./arena-details-form"
import { AnalystsForm } from "@/components/arenas/settings/analysts-form"
import { DangerZone } from "@/components/arenas/settings/danger-zone"
import { notFound } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

  let data;
  try {
      data = await Promise.all([
        getArenaSettingsAction(arenaId),
        getArenaDetailsAction(arenaId)
      ])
  } catch (error) {
      // Likely unauthorized
      return notFound()
  }

  const [settings, arena] = data;
      
  return (
    <div className="container max-w-4xl py-6">
      <h1 className="text-3xl font-bold mb-6">Arena Management</h1>
      
      <Tabs defaultValue="general" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="general">General Details</TabsTrigger>
              <TabsTrigger value="rules">Game Rules</TabsTrigger>
              <TabsTrigger value="analysts">AI Analysts</TabsTrigger>
              <TabsTrigger value="danger" className="text-destructive data-[state=active]:text-destructive">Danger Zone</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <div className="bg-card text-card-foreground rounded-xl border shadow-sm p-6">
                <div className="space-y-1 mb-6">
                    <h2 className="text-2xl font-semibold tracking-tight">General Information</h2>
                    <p className="text-sm text-muted-foreground">
                        Manage your arena's public profile and appearance.
                    </p>
                </div>
                <ArenaDetailsForm arena={arena} />
              </div>
            </TabsContent>

            <TabsContent value="rules">
               <ArenaSettingsForm settings={settings} />
            </TabsContent>

            <TabsContent value="analysts">
               <AnalystsForm settings={settings} />
            </TabsContent>

        <TabsContent value="danger">
           <DangerZone arena={arena} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
