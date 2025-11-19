"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import { CalendarIcon, Trash2, Plus, Link as LinkIcon, ImageIcon, X, Loader2 } from "lucide-react"
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
import { getUploadUrlAction } from "@/app/actions/storage"
import { AssetType } from "@prisma/client"

export function CreateMarketForm({ arenaId }: { arenaId: string }) {
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)

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
      arenaId: arenaId,
      assets: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  })

  const { fields: assetFields, append: appendAsset, remove: removeAsset } = useFieldArray({
    control: form.control,
    name: "assets",
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

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const { uploadUrl, publicUrl } = await getUploadUrlAction(file.type, "market-assets")
      
      const res = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type }
      })

      if (!res.ok) throw new Error("Upload failed")

      appendAsset({
        type: AssetType.IMAGE,
        url: publicUrl,
        label: file.name
      })
    } catch (error) {
      console.error("Upload failed:", error)
      alert("Failed to upload image")
    } finally {
      setIsUploading(false)
      e.target.value = ""
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
              <FormLabel>Description</FormLabel>
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

        <div className="space-y-4 border p-4 rounded-lg bg-muted/20">
          <div className="flex items-center justify-between">
            <FormLabel className="text-base">Attachments & Evidence</FormLabel>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendAsset({ type: AssetType.LINK, url: "", label: "" })}
              >
                <LinkIcon className="h-4 w-4 mr-2" /> Add Link
              </Button>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ImageIcon className="h-4 w-4 mr-2" />
                  )}
                  Add Image
                </Button>
              </div>
            </div>
          </div>

          {assetFields.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Add links or images to help users research this market.
            </p>
          )}

          <div className="space-y-3">
            {assetFields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-3 p-3 bg-background rounded border">
                <div className="mt-2">
                  {field.type === "LINK" ? (
                    <LinkIcon className="h-5 w-5 text-blue-500" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-green-500" />
                  )}
                </div>
                
                <div className="flex-1 space-y-3">
                  <FormField
                    control={form.control as any}
                    name={`assets.${index}.label`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="Label (e.g., Q4 Report)" {...field} className="h-8 text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {field.type === "LINK" ? (
                    <FormField
                      control={form.control as any}
                      name={`assets.${index}.url`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input placeholder="https://example.com/..." {...field} className="h-8 text-sm font-mono" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <div className="relative group w-fit">
                       {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={field.url} 
                        alt="Preview" 
                        className="h-20 w-auto object-cover rounded border" 
                      />
                      <a 
                        href={field.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-xs text-muted-foreground hover:underline block mt-1"
                      >
                        View Full Size
                      </a>
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => removeAsset(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

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
