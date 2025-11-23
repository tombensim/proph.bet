"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, RefreshCw, Loader2, Info, ExternalLink } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { fetchPolymarketMarkets, importPolymarketMarket, type PolymarketMarket } from "@/app/actions/polymarket"

interface PolymarketImportDialogProps {
  arenaId: string
  trigger?: React.ReactNode
}

function formatOutcomes(outcomes: string) {
  try {
    const parsed = JSON.parse(outcomes)
    return Array.isArray(parsed) ? parsed.join(" / ") : outcomes
  } catch {
    return outcomes
  }
}

function formatOdds(prices: string) {
  try {
    const p = JSON.parse(prices)
    return Array.isArray(p) ? p.map((v: string) => Math.round(parseFloat(v) * 100) + "%").join(" / ") : ""
  } catch {
    return ""
  }
}

export function PolymarketImportDialog({ arenaId, trigger }: PolymarketImportDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [importingId, setImportingId] = useState<string | null>(null)
  const [markets, setMarkets] = useState<PolymarketMarket[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  const loadMarkets = async () => {
    setLoading(true)
    try {
      // Fetch top 100 active markets to allow for better client-side filtering
      const data = await fetchPolymarketMarkets({ limit: 100, closed: false })
      setMarkets(data)
    } catch (error) {
      toast.error("Failed to load Polymarket data")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadMarkets()
    }
  }, [open])

  // Filter markets based on search and active tab
  const filteredMarkets = markets.filter(market => {
    const matchesSearch = market.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          market.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (!matchesSearch) return false

    if (activeTab === "all") return true
    
    // Simple keyword mapping for categories since we don't have reliable tag IDs
    const text = (market.question + " " + market.description + " " + (market.groupItemTitle || "")).toLowerCase()
    
    if (activeTab === "politics") return text.includes("trump") || text.includes("biden") || text.includes("election") || text.includes("senate") || text.includes("house") || text.includes("president") || text.includes("policy") || text.includes("fed")
    if (activeTab === "sports") return text.includes("nba") || text.includes("nfl") || text.includes("soccer") || text.includes("football") || text.includes("messi") || text.includes("champions") || text.includes("cup") || text.includes("game")
    if (activeTab === "crypto") return text.includes("bitcoin") || text.includes("ethereum") || text.includes("btc") || text.includes("eth") || text.includes("solana") || text.includes("crypto") || text.includes("token")
    if (activeTab === "science") return text.includes("science") || text.includes("space") || text.includes("climate") || text.includes("energy") || text.includes("ai") || text.includes("tech")
    
    return true
  })

  const handleImport = async (market: PolymarketMarket) => {
    // ... same as before
    setImportingId(market.id)
    try {
      // We pass the "activeTab" as category if it's not "all", otherwise we let logic decide or default
      const category = activeTab !== "all" ? activeTab : undefined
      await importPolymarketMarket(market, arenaId, category)
      toast.success("Market imported successfully")
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import market")
    } finally {
      setImportingId(null)
    }
  }

  // ... helpers

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Import from Polymarket
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Markets from Polymarket</DialogTitle>
          <DialogDescription>
            Select high-volume markets to add to your arena. Odds will be preserved.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search markets..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="ghost" size="icon" onClick={loadMarkets} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList>
              <TabsTrigger value="all">Top Volume</TabsTrigger>
              <TabsTrigger value="politics">Politics</TabsTrigger>
              <TabsTrigger value="sports">Sports</TabsTrigger>
              <TabsTrigger value="crypto">Crypto</TabsTrigger>
              <TabsTrigger value="science">Science/Tech</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-hidden border rounded-md">
          {loading && markets.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-4 space-y-4">
              {filteredMarkets.length === 0 ? (
                 <div className="text-center py-8 text-muted-foreground">No markets found matching your criteria.</div>
              ) : (
                filteredMarkets.map((market) => (
                  <Card key={market.id} className="overflow-hidden">
                    <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          {market.icon && <img src={market.icon} alt="" className="w-6 h-6 rounded-full" />}
                          <h4 className="font-semibold text-sm">{market.question}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {market.description}
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs mt-2">
                          <Badge variant="secondary">
                            Vol: ${(parseFloat(market.volume || "0")).toLocaleString()}
                          </Badge>
                          <Badge variant="outline">
                            Ends: {new Date(market.endDate).toLocaleDateString()}
                          </Badge>
                          <span className="flex items-center gap-1 text-muted-foreground ml-2">
                            <Info className="h-3 w-3" />
                            {formatOutcomes(market.outcomes)}: {formatOdds(market.outcomePrices)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 min-w-[120px]">
                         <Button 
                           size="sm" 
                           onClick={() => handleImport(market)}
                           disabled={!!importingId}
                         >
                           {importingId === market.id ? (
                             <Loader2 className="h-4 w-4 animate-spin" />
                           ) : (
                             "Import"
                           )}
                         </Button>
                         <Button variant="ghost" size="sm" asChild>
                           <a href={`https://polymarket.com/event/${market.id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                             View <ExternalLink className="h-3 w-3" />
                           </a>
                         </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}


