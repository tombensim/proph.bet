import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function Home() {
  const session = await auth()
  
  if (session) {
    redirect("/markets")
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
      <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
        Internal Office Prediction Market
      </h1>
      <p className="max-w-[600px] text-muted-foreground md:text-xl">
        Place bets, climb the leaderboard, and have fun with your colleagues.
      </p>
      <Link href="/api/auth/signin">
        <Button size="lg">Get Started</Button>
      </Link>
    </div>
  );
}
