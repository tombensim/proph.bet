"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import { CalendarIcon, Trash2, Plus, Link as LinkIcon, ImageIcon, X, Loader2, Sparkles, Info, AlertTriangle } from "lucide-react"
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
import { useTransition, useState, useMemo } from "react"
import { MultiUserSelector } from "@/components/ui/multi-user-selector"
import { getUploadUrlAction } from "@/app/actions/storage"
import { AssetType } from "@prisma/client"
import { useTranslations } from 'next-intl';
import { generateDescriptionAction } from "@/app/actions/generate-description"

export function CreateMarketForm({ arenaId, seedLiquidity = 100 }: { arenaId: string, seedLiquidity?: number }) {
  const t = useTranslations('CreateMarket.form');
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
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

  const totalCost = useMemo(() => {
    if (marketType === "BINARY") return seedLiquidity * 2;
    if (marketType === "MULTIPLE_CHOICE") return seedLiquidity * (fields.length || 0);
    return 0;
  }, [marketType, fields, seedLiquidity]);

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
              <FormLabel>{t('marketTitle')}</FormLabel>
              <FormControl>
                <Input placeholder={t('marketTitlePlaceholder')} {...field} />
              </FormControl>
              <FormDescription>
                {t('marketTitleDesc')}
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
                <FormLabel>{t('description')}</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateDescription}
                  disabled={isGenerating || !form.watch("title")}
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin me-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 me-2" />
                  )}
                  {isGenerating ? "Generating..." : "Generate with AI"}
                </Button>
              </div>
              <FormControl>
                <Textarea 
                  placeholder={t('descriptionPlaceholder')} 
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
            <FormLabel className="text-base">{t('attachments')}</FormLabel>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendAsset({ type: AssetType.LINK, url: "", label: "" })}
              >
                <LinkIcon className="h-4 w-4 me-2" /> {t('addLink')}
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
                    <Loader2 className="h-4 w-4 animate-spin me-2" />
                  ) : (
                    <ImageIcon className="h-4 w-4 me-2" />
                  )}
                  {t('addImage')}
                </Button>
              </div>
            </div>
          </div>

          {assetFields.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('attachmentsDesc')}
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
                <FormLabel>{t('marketType')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('marketTypePlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="BINARY">{t('binary')}</SelectItem>
                    <SelectItem value="MULTIPLE_CHOICE">{t('multipleChoice')}</SelectItem>
                    <SelectItem value="NUMERIC_RANGE">{t('numericRange')}</SelectItem>
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
                <FormLabel>{t('resolutionDate')}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full ps-3 text-start font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>{t('pickDate')}</span>
                        )}
                        <CalendarIcon className="ms-auto h-4 w-4 opacity-50" />
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
                <FormLabel>{t('options')}</FormLabel>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => append({ value: "" })}
                >
                  <Plus className="h-4 w-4 me-2" /> {t('addOption')}
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
                <FormLabel>{t('minBet')}</FormLabel>
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
                <FormLabel>{t('maxBet')}</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-6 border p-4 rounded-lg bg-muted/20">
          <h3 className="font-medium">{t('visibility')}</h3>
          
          <FormField
            control={form.control as any}
            name="hiddenFromUserIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('hideMarket')}</FormLabel>
                <FormControl>
                  <MultiUserSelector 
                    value={field.value} 
                    onChange={field.onChange}
                    placeholder={t('hideMarketPlaceholder')}
                  />
                </FormControl>
                <FormDescription>
                  {t('hideMarketDesc')}
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
                <FormLabel>{t('hideBets')}</FormLabel>
                <FormControl>
                  <MultiUserSelector 
                    value={field.value} 
                    onChange={field.onChange}
                    placeholder={t('hideBetsPlaceholder')}
                  />
                </FormControl>
                <FormDescription>
                  {t('hideBetsDesc')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {totalCost > 0 && (
          <div className="border rounded-lg p-4 bg-blue-50/50 border-blue-200 space-y-3">
             <div className="flex items-center gap-2 text-blue-800 font-medium">
                <Info className="h-5 w-5" />
                <h3>{t('liquidityInfo')}</h3>
             </div>
             <p className="text-sm text-blue-700">
                {t('liquidityDesc')}
             </p>
             
             <div className="bg-white/50 p-3 rounded border border-blue-100 space-y-2 text-sm">
                <div className="font-semibold">
                   {t('totalCost', { amount: totalCost })}
                </div>
                <div className="flex gap-2 items-start text-muted-foreground">
                   <span className="text-green-600 font-medium whitespace-nowrap">{t('incentive').split(":")[0]}:</span>
                   <span>{t('incentive').split(":")[1]}</span>
                </div>
                <div className="flex gap-2 items-start text-muted-foreground">
                   <span className="text-orange-600 font-medium whitespace-nowrap">{t('risk').split(":")[0]}:</span>
                   <span>{t('risk').split(":")[1]}</span>
                </div>
             </div>
          </div>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? t('submitting') : t('submit')}
        </Button>
      </form>
    </Form>
  )
}
