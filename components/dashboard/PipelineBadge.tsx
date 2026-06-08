import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PipelineStage } from '@/lib/types'

const stageConfig: Record<
  PipelineStage,
  { label: string; className: string }
> = {
  new: {
    label: 'New',
    className: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100',
  },
  contacted: {
    label: 'Contacted',
    className: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100',
  },
  replied: {
    label: 'Replied',
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
  },
  interested: {
    label: 'Interested',
    className: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100',
  },
  call_booked: {
    label: 'Call Booked',
    className: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100',
  },
  closed_won: {
    label: 'Closed Won',
    className: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100',
  },
  closed_lost: {
    label: 'Closed Lost',
    className: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100',
  },
  not_interested: {
    label: 'Not Interested',
    className: 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-100',
  },
}

interface PipelineBadgeProps {
  stage: PipelineStage
  className?: string
}

export function PipelineBadge({ stage, className }: PipelineBadgeProps) {
  const config = stageConfig[stage] ?? {
    label: stage,
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  }

  return (
    <Badge
      variant="outline"
      className={cn(config.className, 'font-medium text-xs', className)}
    >
      {config.label}
    </Badge>
  )
}
