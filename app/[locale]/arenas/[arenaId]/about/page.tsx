import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ReactMarkdown from "react-markdown"

interface AboutPageProps {
  params: Promise<{ arenaId: string }>
}

export default async function ArenaAboutPage({ params }: AboutPageProps) {
  const { arenaId } = await params
  
  const arena = await prisma.arena.findUnique({
    where: { id: arenaId }
  })

  if (!arena) notFound()

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">{arena.name}</CardTitle>
        </CardHeader>
        <CardContent>
          {arena.about ? (
            <article className="prose dark:prose-invert max-w-none">
              <ReactMarkdown>{arena.about}</ReactMarkdown>
            </article>
          ) : (
            <p className="text-muted-foreground italic">
              {arena.description || "No description available."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

