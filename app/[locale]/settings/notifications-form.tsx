"use client"

import { useTransition, useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { 
  updateNotificationSettings, 
  getNotificationSettings, 
  type NotificationSettingsData 
} from "@/app/actions/notification-settings"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

const notificationSettingsSchema = z.object({
  muted: z.boolean().optional().default(false),
  email_BET_RESOLVED: z.boolean().optional().nullable(),
  web_BET_RESOLVED: z.boolean().optional().nullable(),
  email_MARKET_RESOLVED: z.boolean().optional().nullable(),
  web_MARKET_RESOLVED: z.boolean().optional().nullable(),
  email_WIN_PAYOUT: z.boolean().optional().nullable(),
  web_WIN_PAYOUT: z.boolean().optional().nullable(),
  email_MARKET_CREATED: z.boolean().optional().nullable(),
  web_MARKET_CREATED: z.boolean().optional().nullable(),
  email_MONTHLY_WINNER: z.boolean().optional().nullable(),
  web_MONTHLY_WINNER: z.boolean().optional().nullable(),
  email_POINTS_RESET: z.boolean().optional().nullable(),
  web_POINTS_RESET: z.boolean().optional().nullable(),
  email_MARKET_DISPUTED: z.boolean().optional().nullable(),
  web_MARKET_DISPUTED: z.boolean().optional().nullable(),
})

interface NotificationsFormProps {
  defaultValues: NotificationSettingsData | null
  arenas: { id: string, name: string }[]
}

export function NotificationsForm({ defaultValues, arenas }: NotificationsFormProps) {
  const [isPending, startTransition] = useTransition()
  const [selectedContext, setSelectedContext] = useState<string>("global")
  const [isFetching, setIsFetching] = useState(false)
  
  const form = useForm<NotificationSettingsData>({
    resolver: zodResolver(notificationSettingsSchema) as any,
    defaultValues: defaultValues || {},
  })

  // Determine if we are in "Inherit" mode (all values null and not muted)
  // Note: muted is specific to Arena, not inherited/nullable, default false.
  const values = form.getValues()
  const isInheriting = selectedContext !== "global" && 
                       !values.muted && // If muted, we are definitely overriding
                       Object.entries(values).every(([k, v]) => k === 'muted' || v === null || v === undefined)

  // Fetch settings when context changes
  useEffect(() => {
    async function loadSettings() {
      setIsFetching(true)
      try {
        const settings = await getNotificationSettings(selectedContext === "global" ? undefined : selectedContext)
        form.reset(settings || {}) 
      } catch (error) {
        toast.error("Failed to load settings")
      } finally {
        setIsFetching(false)
      }
    }

    loadSettings()
  }, [selectedContext, form])

  function onSubmit(data: NotificationSettingsData) {
    startTransition(async () => {
      try {
        await updateNotificationSettings(data, selectedContext === "global" ? undefined : selectedContext)
        toast.success("Notification settings updated")
      } catch (error) {
        toast.error("Failed to update settings")
      }
    })
  }

  const toggleInheritance = (checked: boolean) => {
     if (!checked) {
         // Turn OFF override -> Reset to nulls (inherit) + muted false
         const nulls: any = { muted: false }
         Object.keys(notificationSettingsSchema.shape).forEach(key => {
             if (key !== 'muted') nulls[key] = null
         })
         form.reset(nulls)
     } else {
         // Turn ON override -> Set defaults
         const defaults: any = { muted: false }
         Object.keys(notificationSettingsSchema.shape).forEach(key => {
             if (key !== 'muted') defaults[key] = true
         })
         form.reset(defaults)
     }
  }

  const NotificationRow = ({ 
    label, 
    description, 
    emailName, 
    webName 
  }: { 
    label: string, 
    description: string, 
    emailName: keyof NotificationSettingsData, 
    webName: keyof NotificationSettingsData 
  }) => {
    const disabled = isInheriting || isPending || isFetching || form.watch("muted")

    return (
      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <FormLabel className="text-base">{label}</FormLabel>
          <FormDescription>{description}</FormDescription>
        </div>
        <div className="flex items-center space-x-4">
          <FormField
            control={form.control}
            name={emailName}
            render={({ field }) => (
              <FormItem className="flex flex-col items-center space-y-1">
                <FormLabel className="text-xs font-normal text-muted-foreground">Email</FormLabel>
                <FormControl>
                  <Switch
                    checked={!!field.value} // Convert null/undefined to false
                    onCheckedChange={field.onChange}
                    disabled={disabled}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={webName}
            render={({ field }) => (
              <FormItem className="flex flex-col items-center space-y-1">
                <FormLabel className="text-xs font-normal text-muted-foreground">Web</FormLabel>
                <FormControl>
                  <Switch
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                    disabled={disabled}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
           <Label>Context</Label>
           <Select value={selectedContext} onValueChange={setSelectedContext} disabled={isPending}>
            <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select context" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="global">Global Defaults</SelectItem>
                {arenas.map(arena => (
                    <SelectItem key={arena.id} value={arena.id}>{arena.name}</SelectItem>
                ))}
            </SelectContent>
           </Select>
           <p className="text-sm text-muted-foreground">
             {selectedContext === "global" 
               ? "These settings apply to all arenas unless overridden." 
               : "Customize settings specifically for this arena."}
           </p>
        </div>

        {selectedContext !== "global" && (
            <div className="flex items-center space-x-2">
                <Switch 
                    checked={!isInheriting}
                    onCheckedChange={toggleInheritance}
                    disabled={isPending || isFetching}
                />
                <Label>Override Global Settings</Label>
            </div>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {isFetching ? (
                <div className="py-8 text-center text-muted-foreground">Loading settings...</div>
            ) : (
                <div className={isInheriting ? "opacity-50 pointer-events-none" : ""}>
                    
                    {selectedContext !== "global" && (
                        <>
                            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 mb-6">
                                <FormField
                                    control={form.control}
                                    name="muted"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between space-y-0">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base font-semibold text-destructive">Mute Arena</FormLabel>
                                                <FormDescription className="text-destructive/80">
                                                    Disable all notifications for this arena.
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <Separator className="my-6" />
                        </>
                    )}

                    <div className={form.watch("muted") ? "opacity-50 pointer-events-none" : ""}>
                        <div className="space-y-4">
                            <NotificationRow 
                            label="Bet Resolved" 
                            description="Receive notifications when your bets are resolved."
                            emailName="email_BET_RESOLVED"
                            webName="web_BET_RESOLVED"
                            />
                            <NotificationRow 
                            label="Market Resolved" 
                            description="Receive notifications when markets you created or follow are resolved."
                            emailName="email_MARKET_RESOLVED"
                            webName="web_MARKET_RESOLVED"
                            />
                            <NotificationRow 
                            label="Win Payout" 
                            description="Receive notifications when you win points."
                            emailName="email_WIN_PAYOUT"
                            webName="web_WIN_PAYOUT"
                            />
                            <NotificationRow 
                            label="New Markets" 
                            description="Receive notifications when new markets are created."
                            emailName="email_MARKET_CREATED"
                            webName="web_MARKET_CREATED"
                            />
                            <NotificationRow 
                            label="Monthly Winner" 
                            description="Receive notifications about monthly winners."
                            emailName="email_MONTHLY_WINNER"
                            webName="web_MONTHLY_WINNER"
                            />
                            <NotificationRow 
                            label="Points Reset" 
                            description="Receive notifications when points are reset."
                            emailName="email_POINTS_RESET"
                            webName="web_POINTS_RESET"
                            />
                            <NotificationRow 
                            label="Market Disputed" 
                            description="Receive notifications when a market is disputed."
                            emailName="email_MARKET_DISPUTED"
                            webName="web_MARKET_DISPUTED"
                            />
                        </div>
                    </div>
                    
                    <Button type="submit" disabled={isPending || isInheriting} className="mt-6">
                        {isPending ? "Saving..." : "Save preferences"}
                    </Button>
                </div>
            )}
        </form>
      </Form>
    </div>
  )
}
