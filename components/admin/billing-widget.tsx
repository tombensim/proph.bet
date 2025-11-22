"use client"

import * as React from "react"
import { format, startOfMonth } from "date-fns"
import { Calendar as CalendarIcon, Loader2, AlertCircle } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getBillingReport, type BillingReport } from "@/app/actions/admin"

export function BillingWidget() {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  })
  const [report, setReport] = React.useState<BillingReport | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchReport() {
      if (!date?.from) return
      
      setLoading(true)
      setError(null)
      try {
        const data = await getBillingReport(date.from, date.to || date.from)
        setReport(data)
      } catch (err) {
        setError("Failed to fetch billing data")
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [date])

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Infrastructure Costs & Usage</CardTitle>
        <div className="grid gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[300px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[200px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex h-[200px] items-center justify-center text-destructive">
            <AlertCircle className="mr-2 h-4 w-4" />
            {error}
          </div>
        ) : report ? (
           <div className="grid gap-6 md:grid-cols-3 pt-4">
             {/* Vercel */}
             <div className="space-y-3 rounded-lg border p-4">
               <h4 className="font-semibold leading-none tracking-tight flex items-center gap-2">
                 <span className="h-2 w-2 rounded-full bg-black dark:bg-white" />
                 Vercel
               </h4>
               <div className="space-y-2 text-sm">
                 <div className="flex justify-between">
                   <span className="text-muted-foreground">Bandwidth</span>
                   <span className="font-medium">{report.vercel.bandwidth.toFixed(2)} GB</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-muted-foreground">Invocations</span>
                   <span className="font-medium">{report.vercel.functionInvocations.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-muted-foreground">Build Minutes</span>
                   <span className="font-medium">{report.vercel.buildMinutes.toFixed(1)}</span>
                 </div>
               </div>
             </div>
             
             {/* Cloudflare */}
             <div className="space-y-3 rounded-lg border p-4">
               <h4 className="font-semibold leading-none tracking-tight flex items-center gap-2 text-orange-500">
                 <span className="h-2 w-2 rounded-full bg-orange-500" />
                 Cloudflare R2
               </h4>
               <div className="space-y-2 text-sm">
                 <div className="flex justify-between">
                   <span className="text-muted-foreground">Storage</span>
                   <span className="font-medium">{report.cloudflare.storageUsed.toFixed(2)} GB</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-muted-foreground">Class A Ops</span>
                   <span className="font-medium">{report.cloudflare.classAOperations.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-muted-foreground">Class B Ops</span>
                   <span className="font-medium">{report.cloudflare.classBOperations.toLocaleString()}</span>
                 </div>
               </div>
             </div>

             {/* Google */}
             <div className="space-y-3 rounded-lg border p-4">
               <h4 className="font-semibold leading-none tracking-tight flex items-center gap-2 text-blue-500">
                 <span className="h-2 w-2 rounded-full bg-blue-500" />
                 Google Cloud
               </h4>
               <div className="space-y-2 text-sm">
                 {report.google.services.length === 0 && (
                    <div className="text-muted-foreground italic">No service usage data</div>
                 )}
                 {report.google.services.map((svc, i) => (
                   <div key={i} className="flex justify-between">
                     <span className="text-muted-foreground">{svc.name}</span>
                     <span className="font-medium">{svc.cost.toLocaleString()}</span>
                   </div>
                 ))}
               </div>
             </div>
           </div>
        ) : (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            Select a date range to view billing data
          </div>
        )}
      </CardContent>
    </Card>
  )
}

