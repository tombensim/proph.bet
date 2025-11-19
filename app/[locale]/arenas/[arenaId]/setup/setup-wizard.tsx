"use client"

import { useState, useTransition } from "react"
import { useRouter } from "@/lib/navigation"
import { updateArenaSettingsAction } from "@/app/actions/arena-settings"
import { ArenaSettings, ResetFrequency, WinnerRule, MarketCreationPolicy } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Check, ChevronRight, ChevronLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

// Simplified schema for the wizard steps
const step1Schema = z.object({
    resetFrequency: z.nativeEnum(ResetFrequency),
    winnerRule: z.nativeEnum(WinnerRule),
    monthlyAllocation: z.coerce.number().min(0),
})

const step2Schema = z.object({
    creationPolicy: z.nativeEnum(MarketCreationPolicy),
    requireApproval: z.boolean(),
    defaultLanguage: z.string().min(2)
})

export function ArenaSetupWizard({ settings, arenaId }: { settings: ArenaSettings, arenaId: string }) {
  const [step, setStep] = useState(1)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const [formData, setFormData] = useState({
      // Step 1
      resetFrequency: settings.resetFrequency,
      winnerRule: settings.winnerRule,
      monthlyAllocation: settings.monthlyAllocation,
      // Step 2
      creationPolicy: settings.creationPolicy,
      requireApproval: settings.requireApproval,
      defaultLanguage: settings.defaultLanguage
  })

  const totalSteps = 3

  const updateField = (key: string, value: any) => {
      setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleNext = () => {
      if (step < totalSteps) {
          setStep(step + 1)
      } else {
          finishSetup()
      }
  }

  const handleBack = () => {
      if (step > 1) setStep(step - 1)
  }

  const finishSetup = () => {
      startTransition(async () => {
          try {
              // Merge current settings with wizard data
              await updateArenaSettingsAction({
                  ...settings,
                  ...formData,
                  arenaId
              })
              toast.success("Arena setup complete!")
              router.push(`/arenas/${arenaId}/markets`)
          } catch (error) {
              toast.error("Failed to save settings")
          }
      })
  }

  const formatLabel = (value: string): string => {
      // Convert ENUM values to readable format
      const words = value.toLowerCase().split('_')
      return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
        {/* Progress Steps */}
        <div className="flex justify-center gap-4 mb-8">
            {[1, 2, 3].map((s) => (
                <div key={s} className={`flex items-center gap-2 ${s === step ? "text-primary font-bold" : "text-muted-foreground"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${s <= step ? "bg-primary text-primary-foreground border-primary" : "border-muted"}`}>
                        {s < step ? <Check className="w-4 h-4" /> : s}
                    </div>
                    <span className="hidden sm:inline">
                        {s === 1 ? "Cycles & Points" : s === 2 ? "Market Rules" : "Review"}
                    </span>
                </div>
            ))}
        </div>

        <Card className="w-full">
            {step === 1 && (
                <>
                    <CardHeader>
                        <CardTitle>Cycle & Points</CardTitle>
                        <CardDescription>How does your arena competition work?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            <Label>How often should the leaderboard reset?</Label>
                            <RadioGroup value={formData.resetFrequency} onValueChange={(v) => updateField("resetFrequency", v)}>
                                <div className="flex items-center space-x-2 border p-4 rounded-md cursor-pointer hover:bg-muted/50">
                                    <RadioGroupItem value="MONTHLY" id="r1" />
                                    <Label htmlFor="r1" className="cursor-pointer flex-1">
                                        <div className="font-semibold">Monthly</div>
                                        <div className="text-xs text-muted-foreground">Resets on the 1st of every month</div>
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2 border p-4 rounded-md cursor-pointer hover:bg-muted/50">
                                    <RadioGroupItem value="WEEKLY" id="r2" />
                                    <Label htmlFor="r2" className="cursor-pointer flex-1">
                                        <div className="font-semibold">Weekly</div>
                                        <div className="text-xs text-muted-foreground">Resets every Monday</div>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="space-y-3">
                            <Label>How many points do members get per cycle?</Label>
                             <Input 
                                type="number" 
                                value={formData.monthlyAllocation} 
                                onChange={(e) => updateField("monthlyAllocation", Number(e.target.value))}
                            />
                        </div>
                    </CardContent>
                </>
            )}

            {step === 2 && (
                <>
                    <CardHeader>
                        <CardTitle>Market Rules</CardTitle>
                        <CardDescription>Control who creates markets and how.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div className="space-y-3">
                            <Label>Who can create markets?</Label>
                            <Select value={formData.creationPolicy} onValueChange={(v) => updateField("creationPolicy", v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EVERYONE">Everyone (Open)</SelectItem>
                                    <SelectItem value="ADMIN">Admins Only (Strict)</SelectItem>
                                    <SelectItem value="APPROVED_CREATORS">Approved Creators Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <Label>Require Admin Approval?</Label>
                             <div className="flex gap-4">
                                <Button 
                                    type="button" 
                                    variant={formData.requireApproval ? "default" : "outline"}
                                    onClick={() => updateField("requireApproval", true)}
                                    className="flex-1"
                                >
                                    Yes, Review First
                                </Button>
                                <Button 
                                    type="button" 
                                    variant={!formData.requireApproval ? "default" : "outline"}
                                    onClick={() => updateField("requireApproval", false)}
                                    className="flex-1"
                                >
                                    No, Auto-Publish
                                </Button>
                             </div>
                        </div>

                         <div className="space-y-3">
                            <Label>Default Language</Label>
                            <Select value={formData.defaultLanguage} onValueChange={(v) => updateField("defaultLanguage", v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="en">English</SelectItem>
                                    <SelectItem value="he">Hebrew</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </>
            )}

            {step === 3 && (
                <>
                    <CardHeader>
                        <CardTitle>Review Setup</CardTitle>
                        <CardDescription>Does this look correct?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-muted/30 border rounded-lg divide-y">
                            <div className="flex justify-between items-center p-4">
                                <span className="text-sm text-muted-foreground">Reset Frequency</span>
                                <span className="font-medium">{formatLabel(formData.resetFrequency)}</span>
                            </div>
                            <div className="flex justify-between items-center p-4">
                                <span className="text-sm text-muted-foreground">Points per Cycle</span>
                                <span className="font-medium">{formData.monthlyAllocation.toLocaleString()}</span>
                            </div>
                             <div className="flex justify-between items-center p-4">
                                <span className="text-sm text-muted-foreground">Creator Policy</span>
                                <span className="font-medium">{formatLabel(formData.creationPolicy)}</span>
                            </div>
                             <div className="flex justify-between items-center p-4">
                                <span className="text-sm text-muted-foreground">Approval Required</span>
                                <span className="font-medium">{formData.requireApproval ? "Yes" : "No"}</span>
                            </div>
                             <div className="flex justify-between items-center p-4">
                                <span className="text-sm text-muted-foreground">Language</span>
                                <span className="font-medium">{formData.defaultLanguage.toUpperCase()}</span>
                            </div>
                        </div>
                    </CardContent>
                </>
            )}

            <CardFooter className="flex justify-between">
                <Button variant="ghost" onClick={handleBack} disabled={step === 1 || isPending}>
                    <ChevronLeft className="mr-2 w-4 h-4" /> Back
                </Button>
                <Button onClick={handleNext} disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                    {step === 3 ? "Finish Setup" : "Next"}
                    {step < 3 && <ChevronRight className="ml-2 w-4 h-4" />}
                </Button>
            </CardFooter>
        </Card>
    </div>
  )
}

