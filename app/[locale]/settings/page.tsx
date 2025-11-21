import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileForm } from "./profile-form"
import { NotificationsForm } from "./notifications-form"
import { getNotificationSettings } from "@/app/actions/notification-settings"

export default async function SettingsPage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    return redirect("/auth/signin")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    }
  })

  if (!user) return redirect("/auth/signin")

  const notificationSettings = await getNotificationSettings()
  
  // Add muted: false to global settings since it's not in the DB model for global
  // but required by the form type
  const formattedSettings = notificationSettings ? {
    ...notificationSettings,
    muted: false
  } : null
  
  // Fetch user's arenas
  const memberships = await prisma.arenaMembership.findMany({
    where: { userId: session.user.id },
    include: { 
      arena: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })
  
  const arenas = memberships.map(m => ({
    id: m.arena.id,
    name: m.arena.name
  }))

  return (
    <div className="container max-w-2xl py-10">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Manage your public profile information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="p-2 bg-muted rounded-md text-sm text-muted-foreground">
                    {user.email}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed as it is linked to your login provider.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Name</Label>
                  <div className="p-2 bg-muted rounded-md text-sm text-muted-foreground">
                    {user.name}
                  </div>
                </div>

                <ProfileForm user={user} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Choose what you want to be notified about.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationsForm 
                defaultValues={formattedSettings} 
                arenas={arenas}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
