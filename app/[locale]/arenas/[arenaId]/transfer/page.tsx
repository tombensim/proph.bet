"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { transferPointsAction } from "@/app/actions/transfer-points"
import { Loader2, Send } from "lucide-react"
import { useParams } from "next/navigation"

const formSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  amount: z.coerce.number().int().positive("Amount must be positive"),
})

type FormValues = z.infer<typeof formSchema>

export default function TransferPage() {
  const params = useParams()
  const arenaId = params.arenaId as string
  
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    // @ts-ignore
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      amount: 10,
    }
  })

  function onSubmit(data: FormValues) {
    setError(null)
    startTransition(async () => {
      try {
        await transferPointsAction({
          ...data,
          arenaId
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Transfer failed")
      }
    })
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Transfer Points
          </CardTitle>
          <CardDescription>
            Send points to a colleague as a gift or settlement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* @ts-ignore */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="space-y-2">
              <Label>Recipient Email</Label>
              <Input 
                placeholder="colleague@company.com" 
                {...form.register("email")} 
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Amount</Label>
              <Input 
                type="number" 
                {...form.register("amount")} 
              />
              {form.formState.errors.amount && (
                <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
              )}
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Points"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
