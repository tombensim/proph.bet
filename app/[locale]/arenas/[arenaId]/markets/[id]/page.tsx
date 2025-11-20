import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BetForm } from "@/components/market/BetForm"
import { ResolveMarketForm } from "./resolve-form"
import { Separator } from "@/components/ui/separator"
import { CommentsSection } from "./comments-section"
import { PriceChart } from "@/components/market/PriceChart"
import { Link } from "@/lib/navigation"
import { ExternalLink, ImageIcon, LinkIcon } from "lucide-react"
import { getTranslations, getMessages } from 'next-intl/server';
import { EditMarketCover } from "./edit-market-cover"
import { DisputeDialog } from "./dispute-dialog"
import { AlertTriangle } from "lucide-react"
import { ShareMarketButton } from "@/components/market/ShareMarketButton"
import { AnalystSentimentDisplay } from "@/components/market/AnalystSentimentDisplay"

interface PageProps {
  params: Promise<{ arenaId: string; id: string }>
}

export default async function MarketPage(props: PageProps) {
  const params = await props.params;
  const { arenaId, id } = params
  const t = await getTranslations('MarketDetail');
  
  const session = await auth()
  if (!session?.user?.id) return redirect("/api/auth/signin")

  const market = await prisma.market.findUnique({
    where: { id: id },
    include: {
      creator: true,
      options: true,
      assets: true,
      bets: {
        include: { user: true, option: true },
        orderBy: { createdAt: 'desc' }
      },
      priceHistory: {
        orderBy: { createdAt: 'asc' }
      },
      hiddenUsers: {
         select: { id: true }
      },
      hideBetsFromUsers: {
         select: { id: true }
      },
      comments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      },
      disputes: {
        where: { userId: session.user.id },
        select: { id: true }
      },
      analystSentiments: true
    }
  })

  if (!market) notFound()

  // Check visibility
  if (market.hiddenUsers.some(u => u.id === session.user!.id)) {
     return (
       <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
         <div className="p-4 rounded-full bg-muted">
           <span className="text-4xl">🔒</span>
         </div>
         <h1 className="text-xl font-bold">{t('hiddenMarket')}</h1>
         <p className="text-muted-foreground">{t('hiddenMarketDesc')}</p>
       </div>
     )
  }

  // Check bet visibility
  const hideBets = market.hideBetsFromUsers.some(u => u.id === session.user!.id)

  // Get current user points from ArenaMembership
  const membership = await prisma.arenaMembership.findUnique({
    where: { 
        userId_arenaId: { 
            userId: session.user.id, 
            arenaId 
        } 
    },
    select: { points: true }
  })

  const arenaSettings = await prisma.arenaSettings.findUnique({
    where: { arenaId },
    select: { tradingFeePercent: true }
  })
  
  const isCreator = market.creatorId === session.user.id
  const isAdmin = session.user.role === "ADMIN"
  const totalPool = market.bets.reduce((acc, bet) => acc + bet.amount, 0)

  // Prepare Chart Data
  const chartDataMap = new Map()
  market.priceHistory.forEach(h => {
     const time = h.createdAt.toISOString()
     if (!chartDataMap.has(time)) {
         chartDataMap.set(time, { date: time })
     }
     const entry = chartDataMap.get(time)
     entry[h.optionId] = h.price
  })

  const chartData = Array.from(chartDataMap.values())

  // Determine hero image (first image asset)
  const heroImage = market.assets.find(a => a.type === "IMAGE")
  const remainingAssets = market.assets.filter(a => a.id !== heroImage?.id)
  
  const isExpired = market.status === 'OPEN' && new Date() > market.resolutionDate

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Section - Always at top */}
      <div>
        <EditMarketCover 
          marketId={market.id} 
          initialImageUrl={heroImage?.url} 
          marketTitle={market.title}
          isCreator={isCreator}
        />

        <div className="flex items-center gap-3 mb-2">
            <Badge>{market.type}</Badge>
            {market.status === "OPEN" ? (
              isExpired ? (
                 <Badge variant="outline" className="text-yellow-600 border-yellow-600">Expired</Badge>
              ) : (
                 <Badge variant="outline" className="text-green-600 border-green-600">{t('open')}</Badge>
              )
            ) : (
              <Badge variant="destructive">{t('closed')}</Badge>
            )}
            {hideBets && <Badge variant="secondary">{t('betsHidden')}</Badge>}
            
            <ShareMarketButton 
              marketTitle={market.title} 
              className="ms-auto"
            />
        </div>

        {market.status === "RESOLVED" && (
            <div className="mb-4">
            {market.disputes.length > 0 ? (
                <div className="flex items-center gap-2 p-3 bg-yellow-500/10 text-yellow-600 rounded-md border border-yellow-500/20 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    You have disputed this resolution.
                </div>
            ) : (
                <DisputeDialog marketId={market.id} marketTitle={market.title} />
            )}
            </div>
        )}

        <h1 className="text-3xl font-bold mb-2">{market.title}</h1>
        <div className="text-muted-foreground whitespace-pre-wrap mb-4">
          {market.description}
        </div>

        {/* Assets / Evidence Section (excluding hero) */}
        {remainingAssets.length > 0 && (
          <div className="mb-6 space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">{t('resources')}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {remainingAssets.map((asset) => (
                <a 
                  href={asset.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  key={asset.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-all group"
                >
                  {asset.type === "IMAGE" ? (
                      <div className="relative w-10 h-10 flex-shrink-0 rounded-md overflow-hidden bg-muted border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={asset.url} alt="" className="object-cover w-full h-full" />
                      </div>
                  ) : (
                      <div className="flex-shrink-0 p-2 bg-muted rounded-md group-hover:bg-background transition-colors">
                          <LinkIcon className="h-4 w-4 text-blue-500" />
                      </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {asset.label || (asset.type === "IMAGE" ? t('imageAttachment') : t('externalLink'))}
                    </p>
                    <p className="text-xs text-muted-foreground truncate opacity-70 group-hover:opacity-100">
                      {new URL(asset.url).hostname}
                    </p>
                  </div>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-50 transition-opacity" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Right Column (Mobile: Top) */}
        <div className="lg:col-span-1 order-1 lg:order-2">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>{t('placeBet')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-muted rounded-lg text-center">
                  <div className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">{t('totalPool')}</div>
                  <div className="text-2xl font-bold">{totalPool} pts</div>
              </div>
              
              <div className="mb-4 text-sm text-muted-foreground">
                  {t('resolvesOn')} <span className="font-medium text-foreground">{format(market.resolutionDate, "PPP")}</span>
              </div>

              {market.status === "OPEN" && (
                  <BetForm 
                    market={market} 
                    userPoints={membership?.points || 0} 
                    totalPool={totalPool} 
                    feePercent={(arenaSettings?.tradingFeePercent || 0) / 100}
                    isExpired={isExpired}
                  />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Left Column (Mobile: Below Bet Card) */}
        <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
          
          {/* Price Chart */}
          {(market.type === "BINARY" || market.type === "MULTIPLE_CHOICE") && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t('probability')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <PriceChart data={chartData} options={market.options} />
                </CardContent>
              </Card>
          )}
          
          {/* Show Resolution Evidence if Closed */}
          {market.status === "RESOLVED" && market.resolutionImage && (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg border">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                {t('resolutionEvidence')}
                {isAdmin && <Badge variant="outline" className="ms-2">{t('adminReview')}</Badge>}
              </h3>
              <Link 
                href={market.resolutionImage} 
                target="_blank" 
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-4 w-4" />
                {t('viewScreenshot')}
              </Link>
              {/* Simple embed if image */}
              <div className="mt-2 rounded-md overflow-hidden border max-w-sm">
                <img src={market.resolutionImage} alt="Evidence" className="w-full h-auto" />
              </div>
            </div>
          )}

          {/* Resolution Interface for Creator */}
          {isCreator && market.status === "OPEN" && (
              <div className="mb-6">
                <ResolveMarketForm market={market} />
              </div>
          )}

          <AnalystSentimentDisplay sentiments={market.analystSentiments} />

          <Separator />

          <div>
              <h3 className="font-semibold mb-4">{t('recentActivity')}</h3>
              {hideBets ? (
                <div className="text-center py-8 bg-muted/20 rounded-lg border border-dashed">
                  <p className="text-muted-foreground">{t('hiddenActivity')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {market.bets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('noBets')}</p>
                  ) : (
                    market.bets.map(bet => (
                      <div key={bet.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                        <div className="flex flex-col">
                            <span className="font-medium">{bet.user.name || "Anonymous"}</span>
                            <span className="text-xs text-muted-foreground">
                              {bet.option?.text ? t('betOn', { option: bet.option.text }) : 
                              bet.numericValue ? t('predicted', { value: bet.numericValue }) : t('placedBet')}
                            </span>
                        </div>
                        <span className="font-mono font-medium">+{bet.amount} pts</span>
                      </div>
                    ))
                  )}
                </div>
              )}
          </div>

          <Separator />

          {/* Comments Section */}
          <CommentsSection
            marketId={id}
            initialComments={market.comments}
            currentUserId={session.user.id}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </div>
  )
}
