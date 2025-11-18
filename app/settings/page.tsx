import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ProfileForm } from "./profile-form"

export default async function SettingsPage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    return redirect("/api/auth/signin")
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

  if (!user) return redirect("/api/auth/signin")

  return (
    <div className="container max-w-2xl py-10">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      
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
    </div>
  )
}

