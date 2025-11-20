"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import { CalendarIcon, Trash2, Plus } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { createMarketAction } from "@/app/actions/create-market"
import { CreateMarketValues, createMarketSchema } from "@/lib/schemas"
import { useTransition, useState } from "react"
import { MultiUserSelector } from "@/components/ui/multi-user-selector"
import { generateDescriptionAction } from "@/app/actions/generate-description"
import { Loader2, Sparkles } from "lucide-react"

export function CreateMarketForm() {
  const [isPending, startTransition] = useTransition()
  const [isGenerating, setIsGenerating] = useState(false)

  const form = useForm<CreateMarketValues>({
    // @ts-ignore
    resolver: zodResolver(createMarketSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "BINARY",
      minBet: 10,
      hiddenFromUserIds: [],
      hideBetsFromUserIds: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  })

  const marketType = form.watch("type")

  function onSubmit(data: CreateMarketValues) {
    startTransition(async () => {
      try {
        await createMarketAction(data)
      } catch (error) {
        console.error(error)
      }
    })
  }

  async function handleGenerateDescription() {
    const title = form.getValues("title")
    const type = form.getValues("type")
    const options = form.getValues("options")
    const resolutionDate = form.getValues("resolutionDate")

    if (!title || title.trim().length < 10) {
      alert("Please enter a title (at least 10 characters) before generating a description")
      return
    }

    setIsGenerating(true)
    try {
      const result = await generateDescriptionAction({
        title,
        type,
        options: options?.map(o => o.value).filter(Boolean),
        resolutionDate,
        // No arenaId here as this is global create
      })

      if (result.error) {
        alert(result.error)
      } else if (result.description) {
        form.setValue("description", result.description)
      }
    } catch (error) {
      console.error("Failed to generate description:", error)
      alert("Failed to generate description. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Form {...form}>
      {/* @ts-ignore */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control as any}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Market Title</FormLabel>
              <FormControl>
                <Input placeholder="Will sales exceed $1M in Q4?" {...field} />
              </FormControl>
              <FormDescription>
                A clear and concise question.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control as any}
          name="description"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Description</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateDescription}
                  disabled={isGenerating || !form.watch("title")}
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  {isGenerating ? "Generating..." : "Generate with AI"}
                </Button>
              </div>
              <FormControl>
                <Textarea 
                  placeholder="Provide additional context for the market..." 
                  className="resize-none" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control as any}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Market Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a market type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="BINARY">Binary (Yes/No)</SelectItem>
                    <SelectItem value="MULTIPLE_CHOICE">Multiple Choice</SelectItem>
                    <SelectItem value="NUMERIC_RANGE">Numeric Range</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="resolutionDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Resolution Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date()
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {marketType === "MULTIPLE_CHOICE" && (
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <FormLabel>Options</FormLabel>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => append({ value: "" })}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Option
                </Button>
             </div>
             {fields.map((field, index) => (
               <FormField
                 key={field.id}
                 control={form.control as any}
                 name={`options.${index}.value`}
                 render={({ field }) => (
                   <FormItem>
                     <div className="flex items-center gap-2">
                       <FormControl>
                         <Input placeholder={`Option ${index + 1}`} {...field} />
                       </FormControl>
                       <Button
                         type="button"
                         variant="ghost"
                         size="icon"
                         onClick={() => remove(index)}
                         disabled={fields.length <= 2}
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     </div>
                     <FormMessage />
                   </FormItem>
                 )}
               />
             ))}
             {form.formState.errors.options && (
               <p className="text-sm font-medium text-destructive">
                 {form.formState.errors.options.message || form.formState.errors.options.root?.message}
               </p>
             )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <FormField
            control={form.control as any}
            name="minBet"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Bet</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control as any}
            name="maxBet"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Bet (Optional)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-6 border p-4 rounded-lg bg-muted/20">
          <h3 className="font-medium">Visibility Settings (Optional)</h3>
          
          <FormField
            control={form.control as any}
            name="hiddenFromUserIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hide Entire Market From</FormLabel>
                <FormControl>
                  <MultiUserSelector 
                    value={field.value} 
                    onChange={field.onChange}
                    placeholder="Select users who cannot see this market..."
                  />
                </FormControl>
                <FormDescription>
                  These users will see a locked market and cannot access details.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="hideBetsFromUserIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hide Bets Activity From</FormLabel>
                <FormControl>
                  <MultiUserSelector 
                    value={field.value} 
                    onChange={field.onChange}
                    placeholder="Select users who cannot see others' bets..."
                  />
                </FormControl>
                <FormDescription>
                  These users can bet, but cannot see who else bet or what they bet on.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create Market"}
        </Button>
      </form>
    </Form>
  )
}
