"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Loader2, Plus, Trash2, Bot } from "lucide-react"
import { updateArenaAnalystsAction } from "@/app/actions/arena-settings"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArenaSettings } from "@prisma/client"

const analystSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  prompt: z.string().min(10, "Prompt must be at least 10 characters"),
  avatar: z.string().optional(), // URL or icon name
})

const formSchema = z.object({
  analystsEnabled: z.boolean(),
  analysts: z.array(analystSchema)
})

interface AnalystsFormProps {
  settings: ArenaSettings
}

export function AnalystsForm({ settings }: AnalystsFormProps) {
  const [isSaving, setIsSaving] = useState(false)

  // Cast the JSON to our type
  const defaultAnalysts = (settings.analysts as any) || []

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      analystsEnabled: settings.analystsEnabled ?? false,
      analysts: defaultAnalysts,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "analysts",
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true)
    try {
      const result = await updateArenaAnalystsAction({
          arenaId: settings.arenaId,
          analysts: values.analysts,
          analystsEnabled: values.analystsEnabled
      })
      
      if (result.success) {
        toast.success("Analysts updated successfully")
      } else {
          toast.error("Failed to update analysts")
      }
    } catch (error) {
      toast.error("Something went wrong")
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Analysts</CardTitle>
        <CardDescription>
          Configure AI personas that will react to market activity.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <FormField
              control={form.control}
              name="analystsEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Enable AI Analysts</FormLabel>
                    <FormDescription>
                      When enabled, analysts will react to new bets and comments.
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

            {form.watch("analystsEnabled") && (
                <div className="space-y-6">
                    {fields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-lg space-y-4 bg-muted/30">
                        <div className="flex justify-between items-start">
                            <h4 className="font-medium flex items-center gap-2">
                                <Bot className="w-4 h-4" /> Analyst #{index + 1}
                            </h4>
                            <Button variant="ghost" size="sm" onClick={() => remove(index)} type="button" className="text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                        
                        <FormField
                        control={form.control}
                        name={`analysts.${index}.name`}
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Risk Taker" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        
                        <FormField
                        control={form.control}
                        name={`analysts.${index}.prompt`}
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>System Prompt (Persona)</FormLabel>
                            <FormControl>
                                <Textarea 
                                    placeholder="You are a risky trader who loves volatility..." 
                                    className="min-h-[100px]"
                                    {...field} 
                                />
                            </FormControl>
                            <FormDescription>
                                Describe how this analyst should behave and react to market moves.
                            </FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                    ))}

                    <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => append({ name: "", prompt: "" })}
                    >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Analyst
                    </Button>
                </div>
            )}

            <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
