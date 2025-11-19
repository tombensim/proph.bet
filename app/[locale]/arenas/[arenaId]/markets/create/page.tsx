import { CreateMarketForm } from "./create-market-form"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getTranslations } from 'next-intl/server';

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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>
      <div className="bg-card p-6 rounded-lg border shadow-sm">
         <CreateMarketForm arenaId={arenaId} />
      </div>
    </div>
  )
}
