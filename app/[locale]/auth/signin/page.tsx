import Image from "next/image"
import { SignInButtons } from "./sign-in-buttons"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function SignInPage() {
  const isDev = process.env.NODE_ENV === "development"

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
      <Card className="w-full max-w-[480px] shadow-lg border-0 sm:border bg-white">
        <CardHeader className="space-y-6 pb-8 text-center">
          <div className="flex justify-center">
            <div className="relative w-32 h-32 animate-in fade-in zoom-in duration-500">
              <Image
                src="/chami-beige.png"
                alt="Proph.bet Mascot"
                fill
                className="object-contain drop-shadow-md"
                priority
              />
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold tracking-tight">
              Welcome to proph.bet
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground max-w-sm mx-auto">
              Join your colleagues in friendly betting competitions. 
              Predict outcomes, climb the leaderboard, and claim the glory!
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pb-8 px-8">
          <SignInButtons isDev={isDev} />
        </CardContent>
      </Card>
    </div>
  )
}

