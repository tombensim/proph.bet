import { prisma } from "@/lib/prisma"

export async function NewsTicker({ arenaId }: { arenaId: string }) {
  const news = await prisma.arenaNews.findFirst({
    where: { arenaId },
    orderBy: { createdAt: 'desc' }
  })

  if (!news || !news.headlines.length) return null

  // Content block to duplicate
  const content = (
    <div className="flex items-center gap-12 px-6 shrink-0">
      {news.headlines.map((headline, i) => (
        <span key={i} className="flex items-center font-medium text-sm uppercase tracking-wide">
          <span className="mr-3 text-primary-foreground/50">◆</span>
          {headline}
        </span>
      ))}
    </div>
  )

  return (
    <div className="bg-zinc-900 text-white w-full overflow-hidden py-2.5 z-40 border-b border-white/10 relative select-none">
       <div className="flex w-fit animate-marquee hover:[animation-play-state:paused]">
          {content}
          {content}
          {content} 
          {content}
       </div>
    </div>
  )
}
