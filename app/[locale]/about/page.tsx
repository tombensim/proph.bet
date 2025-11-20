import { Navbar } from "@/components/layout/Navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { auth } from "@/lib/auth"
import Image from "next/image"
import { getTranslations } from "next-intl/server"

export default async function AboutPage() {
  const session = await auth()
  const t = await getTranslations('AboutPage')

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
              {t('hero.title')}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('hero.subtitle')}
            </p>
          </div>

          {/* Intro Card */}
          <Card className="border-2 border-primary/10 bg-secondary/30 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <p className="text-lg leading-relaxed font-medium">
                {t('intro.text')}
              </p>
            </CardContent>
          </Card>

          {/* Fun Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="transform hover:-translate-y-1 transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-2xl">{t('features.crystalBall.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t('features.crystalBall.description')}
                </p>
              </CardContent>
            </Card>
            <Card className="transform hover:-translate-y-1 transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-2xl">{t('features.trustedCircles.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t('features.trustedCircles.description')}
                </p>
              </CardContent>
            </Card>
            <Card className="transform hover:-translate-y-1 transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-2xl">{t('features.glory.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t('features.glory.description')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* How it Works - Playful Version */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-center">{t('howToPlay.title')}</h2>
            <div className="grid gap-4 md:grid-cols-4">
                <div className="flex flex-col items-center text-center space-y-2 p-4 rounded-lg bg-card border hover:border-primary/50 transition-colors">
                    <div className="text-4xl mb-2">🏟️</div>
                    <h3 className="font-bold">{t('howToPlay.steps.join.title')}</h3>
                    <p className="text-sm text-muted-foreground">{t('howToPlay.steps.join.description')}</p>
                </div>
                <div className="flex flex-col items-center text-center space-y-2 p-4 rounded-lg bg-card border hover:border-primary/50 transition-colors">
                    <div className="text-4xl mb-2">💡</div>
                    <h3 className="font-bold">{t('howToPlay.steps.pick.title')}</h3>
                    <p className="text-sm text-muted-foreground">{t('howToPlay.steps.pick.description')}</p>
                </div>
                <div className="flex flex-col items-center text-center space-y-2 p-4 rounded-lg bg-card border hover:border-primary/50 transition-colors">
                    <div className="text-4xl mb-2">📉</div>
                    <h3 className="font-bold">{t('howToPlay.steps.watch.title')}</h3>
                    <p className="text-sm text-muted-foreground">{t('howToPlay.steps.watch.description')}</p>
                </div>
                <div className="flex flex-col items-center text-center space-y-2 p-4 rounded-lg bg-card border hover:border-primary/50 transition-colors">
                    <div className="text-4xl mb-2">👑</div>
                    <h3 className="font-bold">{t('howToPlay.steps.win.title')}</h3>
                    <p className="text-sm text-muted-foreground">{t('howToPlay.steps.win.description')}</p>
                </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
