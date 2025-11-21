import { prisma } from "@/lib/prisma"
import Image from "next/image"

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
          <div className="mr-3 relative w-6 h-6 opacity-80 grayscale">
            <Image 
              src="/chami.png" 
              alt="sep"
              fill
              className="object-contain"
            />
          </div>
          {headline}
        </span>
      ))}
    </div>
  )

  return (
    <div className="bg-zinc-900 text-white overflow-hidden py-2.5 z-40 border-b border-white/10 relative select-none -mx-4 sticky top-16 w-screen max-w-full">
       <div className="flex w-fit animate-marquee hover:[animation-play-state:paused]">
          {content}
          {content}
          {content} 
          {content}
       </div>
    </div>
  )
}
