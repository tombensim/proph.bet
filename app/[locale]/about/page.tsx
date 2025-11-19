import { Navbar } from "@/components/layout/Navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { auth } from "@/lib/auth"
import Image from "next/image"

export default async function AboutPage() {
  const session = await auth()

  return (
    <>
      <Navbar />
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <div className="flex justify-center animate-in zoom-in duration-500">
                <Image 
                    src="/chami-spinning.png" 
                    alt="Chami Spinning" 
                    width={120} 
                    height={120} 
                    className="object-contain hover:scale-110 transition-transform"
                />
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Predict. Play. Win.
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your private arena for settling debates, predicting the future, and proving you were right all along.
            </p>
          </div>

          {/* Intro Card */}
          <Card className="border-2 border-primary/10 bg-secondary/30 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <p className="text-lg leading-relaxed font-medium">
                Think of proph.bet as your private Polymarket for you and your friends. 
                Whether it's predicting the next big tech launch, office pools, or just settling who's going to be late to the meeting, 
                we make it fun, easy, and oddly addictive.
              </p>
            </CardContent>
          </Card>

          {/* Fun Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="transform hover:-translate-y-1 transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-2xl">🔮 Crystal Ball</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Create markets on literally anything. "Will it rain tomorrow?" "Will Dave eat a salad?" The sky's the limit.
                </p>
              </CardContent>
            </Card>
            <Card className="transform hover:-translate-y-1 transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-2xl">🤝 Trusted Circles</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Keep it cozy. Invite your friends, colleagues, or community members into a private Arena where what happens stays in the group.
                </p>
              </CardContent>
            </Card>
            <Card className="transform hover:-translate-y-1 transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-2xl">🏆 Glory & Bragging Rights</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Climb the leaderboard and secure your status as the resident oracle. Points are virtual, but the glory is real.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* How it Works - Playful Version */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-center">How to Play</h2>
            <div className="grid gap-4 md:grid-cols-4">
                <div className="flex flex-col items-center text-center space-y-2 p-4 rounded-lg bg-card border hover:border-primary/50 transition-colors">
                    <div className="text-4xl mb-2">🏟️</div>
                    <h3 className="font-bold">Join an Arena</h3>
                    <p className="text-sm text-muted-foreground">Enter the ring.</p>
                </div>
                <div className="flex flex-col items-center text-center space-y-2 p-4 rounded-lg bg-card border hover:border-primary/50 transition-colors">
                    <div className="text-4xl mb-2">💡</div>
                    <h3 className="font-bold">Make a Pick</h3>
                    <p className="text-sm text-muted-foreground">Trust your gut.</p>
                </div>
                <div className="flex flex-col items-center text-center space-y-2 p-4 rounded-lg bg-card border hover:border-primary/50 transition-colors">
                    <div className="text-4xl mb-2">📉</div>
                    <h3 className="font-bold">Watch the Odds</h3>
                    <p className="text-sm text-muted-foreground">Market moves fast.</p>
                </div>
                <div className="flex flex-col items-center text-center space-y-2 p-4 rounded-lg bg-card border hover:border-primary/50 transition-colors">
                    <div className="text-4xl mb-2">👑</div>
                    <h3 className="font-bold">Claim Victory</h3>
                    <p className="text-sm text-muted-foreground">I told you so.</p>
                </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
