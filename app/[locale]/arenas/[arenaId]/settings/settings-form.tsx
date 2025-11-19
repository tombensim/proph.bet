"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArenaSettings, ResetFrequency, WinnerRule, MarketCreationPolicy, AMMType, MarketType } from "@prisma/client"
import { updateArenaSettingsAction } from "@/app/actions/arena-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

// Re-define schema to match server action (or import if possible, but client/server split)
// This schema must match the one in app/actions/arena-settings.ts
const settingsFormSchema = z.object({
  arenaId: z.string(),
  resetFrequency: z.nativeEnum(ResetFrequency),
  winnerRule: z.nativeEnum(WinnerRule),
  monthlyAllocation: z.coerce.number().min(0),
  allowCarryover: z.boolean(),
  allowTransfers: z.boolean(),
  transferLimit: z.coerce.number().optional().nullable(),
  creationPolicy: z.nativeEnum(MarketCreationPolicy),
  allowedTypes: z.array(z.nativeEnum(MarketType)),
  defaultExpirationHours: z.coerce.number().min(1),
  requireApproval: z.boolean(),
  defaultLanguage: z.string().min(2),
  ammType: z.nativeEnum(AMMType),
  tradingFeePercent: z.coerce.number().min(0).max(100),
  seedLiquidity: z.coerce.number().min(0)
})

type SettingsFormValues = z.infer<typeof settingsFormSchema>

export function ArenaSettingsForm({ settings }: { settings: ArenaSettings }) {
  const [isPending, startTransition] = useTransition()

  const form = useForm({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      arenaId: settings.arenaId,
      resetFrequency: settings.resetFrequency,
      winnerRule: settings.winnerRule,
      monthlyAllocation: settings.monthlyAllocation,
      allowCarryover: settings.allowCarryover,
      allowTransfers: settings.allowTransfers,
      transferLimit: settings.transferLimit,
      creationPolicy: settings.creationPolicy,
      allowedTypes: settings.allowedTypes,
      defaultExpirationHours: settings.defaultExpirationHours,
      requireApproval: settings.requireApproval,
      defaultLanguage: settings.defaultLanguage,
      ammType: settings.ammType,
      tradingFeePercent: settings.tradingFeePercent,
      seedLiquidity: settings.seedLiquidity
    }
  })

  function onSubmit(data: SettingsFormValues) {
    startTransition(async () => {
      try {
        await updateArenaSettingsAction(data)
        toast.success("Settings updated successfully")
      } catch (error) {
        toast.error("Failed to update settings")
        console.error(error)
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Tabs defaultValue="cycle" className="w-full">
          <TabsList>
            <TabsTrigger value="cycle">Cycle & Points</TabsTrigger>
            <TabsTrigger value="markets">Market Rules</TabsTrigger>
            <TabsTrigger value="amm">AMM & Fees</TabsTrigger>
          </TabsList>
          
          {/* CYCLE & POINTS TAB */}
          <TabsContent value="cycle">
            <Card>
              <CardHeader>
                <CardTitle>Cycle & Points Configuration</CardTitle>
                <CardDescription>Manage how points are distributed and when the arena resets.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="resetFrequency" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Reset Frequency</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value={ResetFrequency.MONTHLY}>Monthly</SelectItem>
                                    <SelectItem value={ResetFrequency.WEEKLY}>Weekly</SelectItem>
                                    <SelectItem value={ResetFrequency.CUSTOM}>Custom</SelectItem>
                                    <SelectItem value={ResetFrequency.MANUAL}>Manual Only</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormDescription>How often the leaderboard resets.</FormDescription>
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="winnerRule" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Winner Rule</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value={WinnerRule.HIGHEST_BALANCE}>Highest Balance</SelectItem>
                                    <SelectItem value={WinnerRule.MOST_BETS_WON}>Most Bets Won</SelectItem>
                                    <SelectItem value={WinnerRule.HIGHEST_ROI}>Highest ROI</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="monthlyAllocation" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Monthly Allocation</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} value={field.value as number} />
                            </FormControl>
                            <FormDescription>Points given to members on reset.</FormDescription>
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="allowCarryover" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">Allow Carryover</FormLabel>
                                <FormDescription>Do unused points carry over to next cycle?</FormDescription>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                    )} />
                </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="allowTransfers" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">Allow Transfers</FormLabel>
                                <FormDescription>Can members transfer points to each other?</FormDescription>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                    )} />
                     <FormField control={form.control} name="transferLimit" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Transfer Limit (Optional)</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="Unlimited" {...field} value={(field.value as number | null) ?? ""} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} />
                            </FormControl>
                            <FormDescription>Max points per transfer.</FormDescription>
                        </FormItem>
                    )} />
                 </div>

              </CardContent>
            </Card>
          </TabsContent>

          {/* MARKET RULES TAB */}
          <TabsContent value="markets">
            <Card>
              <CardHeader>
                <CardTitle>Market Creation Rules</CardTitle>
                <CardDescription>Control who can create markets and how they behave.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="creationPolicy" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Creation Policy</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value={MarketCreationPolicy.EVERYONE}>Everyone</SelectItem>
                                    <SelectItem value={MarketCreationPolicy.ADMIN}>Admins Only</SelectItem>
                                    <SelectItem value={MarketCreationPolicy.APPROVED_CREATORS}>Approved Creators Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )} />
                    
                     <FormField control={form.control} name="defaultExpirationHours" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Default Expiration (Hours)</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} value={field.value as number} />
                            </FormControl>
                        </FormItem>
                    )} />
                </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="requireApproval" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">Require Approval</FormLabel>
                                <FormDescription>Markets must be approved by admin before opening.</FormDescription>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="defaultLanguage" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Default Language</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select language" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="en">English (en)</SelectItem>
                                    <SelectItem value="he">Hebrew (he)</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormDescription>Select the default language for this arena.</FormDescription>
                        </FormItem>
                    )} />
                 </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AMM & FEES TAB */}
          <TabsContent value="amm">
            <Card>
              <CardHeader>
                <CardTitle>Automated Market Maker (AMM)</CardTitle>
                <CardDescription>Configure liquidity and fee structures.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="ammType" render={({ field }) => (
                        <FormItem>
                            <FormLabel>AMM Type</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value={AMMType.FPMM}>FPMM (Uniswap-style)</SelectItem>
                                    <SelectItem value={AMMType.LMSR}>LMSR (Logarithmic)</SelectItem>
                                    <SelectItem value={AMMType.FIXED_ODDS}>Fixed Odds</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="tradingFeePercent" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Trading Fee (%)</FormLabel>
                            <FormControl>
                                <Input type="number" step="0.1" {...field} value={field.value as number} />
                            </FormControl>
                            <FormDescription>Fee taken from each bet.</FormDescription>
                        </FormItem>
                    )} />

                     <FormField control={form.control} name="seedLiquidity" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Seed Liquidity (Points)</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} value={field.value as number} />
                            </FormControl>
                            <FormDescription>Initial liquidity added to new markets.</FormDescription>
                        </FormItem>
                    )} />
                 </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
        
        <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
            </Button>
        </div>
      </form>
    </Form>
  )
}

