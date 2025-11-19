import { CreateMarketForm } from "./create-market-form"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getTranslations } from 'next-intl/server';
import Image from "next/image"
import { prisma } from "@/lib/prisma"

interface PageProps {
    params: Promise<{ arenaId: string }>
}

export default async function CreateMarketPage(props: PageProps) {
  const session = await auth()
  const t = await getTranslations('CreateMarket');

  if (!session?.user) {
    redirect("/api/auth/signin")
  }

  const { arenaId } = await props.params

  const arenaSettings = await prisma.arenaSettings.findUnique({
    where: { arenaId }
  })

  const seedLiquidity = arenaSettings?.seedLiquidity ?? 100

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 flex items-center gap-4">
        <div className="relative w-20 h-20 hidden sm:block">
          <Image 
            src="/chami-scribble.png" 
            alt="Creating Market" 
            fill 
            className="object-contain"
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
      </div>
      <div className="bg-card p-6 rounded-lg border shadow-sm">
         <CreateMarketForm arenaId={arenaId} seedLiquidity={seedLiquidity} />
      </div>
    </div>
  )
}
