import { CreateMarketForm } from "./create-market-form"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function CreateMarketPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/api/auth/signin")
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create New Market</h1>
        <p className="text-muted-foreground">
          Set up a new prediction market for your colleagues.
        </p>
      </div>
      <div className="bg-card p-6 rounded-lg border shadow-sm">
         <CreateMarketForm />
      </div>
    </div>
  )
}

