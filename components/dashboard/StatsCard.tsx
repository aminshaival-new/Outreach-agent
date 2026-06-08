import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  change?: number
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'orange'
  suffix?: string
}

const colorConfig = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'bg-blue-100 text-blue-600',
    value: 'text-blue-900',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'bg-green-100 text-green-600',
    value: 'text-green-900',
  },
  yellow: {
    bg: 'bg-yellow-50',
    icon: 'bg-yellow-100 text-yellow-600',
    value: 'text-yellow-900',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'bg-purple-100 text-purple-600',
    value: 'text-purple-900',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'bg-red-100 text-red-600',
    value: 'text-red-900',
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'bg-orange-100 text-orange-600',
    value: 'text-orange-900',
  },
}

export function StatsCard({ title, value, icon, change, color, suffix }: StatsCardProps) {
  const colors = colorConfig[color]

  const renderChange = () => {
    if (change === undefined || change === null) return null
    const isPositive = change > 0
    const isNeutral = change === 0
    const absChange = Math.abs(change)

    return (
      <div
        className={cn(
          'flex items-center gap-1 text-xs font-medium mt-1',
          isNeutral ? 'text-slate-500' : isPositive ? 'text-green-600' : 'text-red-500'
        )}
      >
        {isNeutral ? (
          <Minus className="w-3 h-3" />
        ) : isPositive ? (
          <TrendingUp className="w-3 h-3" />
        ) : (
          <TrendingDown className="w-3 h-3" />
        )}
        <span>
          {isNeutral ? 'No change' : `${isPositive ? '+' : '-'}${absChange}% from yesterday`}
        </span>
      </div>
    )
  }

  return (
    <Card className={cn('border-0 shadow-sm', colors.bg)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-600 truncate">{title}</p>
            <div className="flex items-baseline gap-1 mt-1">
              <p className={cn('text-3xl font-bold tracking-tight', colors.value)}>
                {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
              </p>
              {suffix && <span className="text-sm text-slate-500">{suffix}</span>}
            </div>
            {renderChange()}
          </div>
          <div className={cn('flex items-center justify-center w-12 h-12 rounded-xl shrink-0', colors.icon)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
