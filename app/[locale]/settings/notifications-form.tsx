"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { updateNotificationSettings, type NotificationSettingsData } from "@/app/actions/notification-settings"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

const notificationSettingsSchema = z.object({
  email_BET_RESOLVED: z.boolean(),
  web_BET_RESOLVED: z.boolean(),
  email_MARKET_RESOLVED: z.boolean(),
  web_MARKET_RESOLVED: z.boolean(),
  email_WIN_PAYOUT: z.boolean(),
  web_WIN_PAYOUT: z.boolean(),
  email_MARKET_CREATED: z.boolean(),
  web_MARKET_CREATED: z.boolean(),
  email_MONTHLY_WINNER: z.boolean(),
  web_MONTHLY_WINNER: z.boolean(),
  email_POINTS_RESET: z.boolean(),
  web_POINTS_RESET: z.boolean(),
})

interface NotificationsFormProps {
  defaultValues: NotificationSettingsData
}

export function NotificationsForm({ defaultValues }: NotificationsFormProps) {
  const [isPending, startTransition] = useTransition()
  const form = useForm<NotificationSettingsData>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues,
  })

  function onSubmit(data: NotificationSettingsData) {
    startTransition(async () => {
      try {
        await updateNotificationSettings(data)
        toast.success("Notification settings updated")
      } catch (error) {
        toast.error("Failed to update settings")
      }
    })
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
  }) => (
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
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isPending}
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
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isPending}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save preferences"}
        </Button>
      </form>
    </Form>
  )
}

