"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format, differenceInDays } from 'date-fns'
import { useTranslations } from 'next-intl'
import { useIsMounted } from '@/lib/hooks/use-is-mounted'

interface PriceChartProps {
  data: any[]
  options: { id: string, text: string, color?: string }[]
}

const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#d97706", "#9333ea"]

export function PriceChart({ data, options }: PriceChartProps) {
  const t = useTranslations('MarketDetail');
  const isMounted = useIsMounted();
  
  if (!data || data.length === 0) {
    return (
       <div className="h-[300px] flex items-center justify-center text-muted-foreground border rounded-lg bg-muted/10">
         {t('noPriceHistory')}
       </div>
    )
  }

  const startDate = new Date(data[0].date)
  const endDate = new Date(data[data.length - 1].date)
  const showTime = differenceInDays(endDate, startDate) < 2

  // Filter to only show "Yes" for binary to keep it clean
  const isBinary = options.length === 2 && options.some(o => o.text.toLowerCase() === 'yes')
  const linesToShow = isBinary 
    ? options.filter(o => o.text.toLowerCase() === 'yes') 
    : options

  return (
    <div className="h-[300px] w-full mt-4">
      {isMounted ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(time) => format(new Date(time), showTime ? 'HH:mm' : 'MMM d')}
              stroke="#9ca3af"
              fontSize={12}
              minTickGap={30}
            />
            <YAxis 
              domain={[0, 1]} 
              tickFormatter={(val) => `${Math.round(val * 100)}%`}
              stroke="#9ca3af"
              fontSize={12}
            />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-background border rounded p-2 shadow-md text-xs">
                      <p className="font-semibold mb-1">{label ? format(new Date(label), 'MMM d, HH:mm') : ''}</p>
                      {payload.map((entry: any) => (
                        <div key={entry.name} className="flex items-center gap-2" style={{ color: entry.color }}>
                          <span>{entry.name}:</span>
                          <span className="font-mono font-bold">{Math.round(entry.value * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  )
                }
                return null
              }}
            />
            {linesToShow.length > 1 && <Legend />}
            {linesToShow.map((option, index) => (
              <Line
                key={option.id}
                type="monotone"
                dataKey={option.id} // Data is keyed by option ID
                name={option.text}
                stroke={isBinary ? "#16a34a" : COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls // Ensures line is continuous even if some points are missing
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">Loading chart...</div>
      )}
    </div>
  )
}
