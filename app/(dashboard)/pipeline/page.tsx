'use client'

import { useState, useRef } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Star, Phone, GripVertical, Globe } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { LeadDrawer } from '@/components/dashboard/LeadDrawer'
import { useToast } from '@/components/ui/use-toast'
import type { Lead, PipelineStage } from '@/lib/types'
import { formatPhone } from '@/lib/utils'

type Column = {
  id: PipelineStage
  label: string
  color: string
  headerColor: string
}

const COLUMNS: Column[] = [
  { id: 'new', label: 'New', color: 'bg-slate-50 border-slate-200', headerColor: 'bg-slate-100 text-slate-700' },
  { id: 'contacted', label: 'Contacted', color: 'bg-blue-50 border-blue-200', headerColor: 'bg-blue-100 text-blue-700' },
  { id: 'replied', label: 'Replied', color: 'bg-yellow-50 border-yellow-200', headerColor: 'bg-yellow-100 text-yellow-700' },
  { id: 'interested', label: 'Interested', color: 'bg-purple-50 border-purple-200', headerColor: 'bg-purple-100 text-purple-700' },
  { id: 'call_booked', label: 'Call Booked', color: 'bg-orange-50 border-orange-200', headerColor: 'bg-orange-100 text-orange-700' },
  { id: 'closed_won', label: 'Closed Won', color: 'bg-green-50 border-green-200', headerColor: 'bg-green-100 text-green-700' },
  { id: 'closed_lost', label: 'Closed Lost', color: 'bg-red-50 border-red-200', headerColor: 'bg-red-100 text-red-700' },
  { id: 'not_interested', label: 'Not Interested', color: 'bg-slate-50 border-slate-200', headerColor: 'bg-slate-200 text-slate-600' },
]

const generateLeads = (): Lead[] => {
  const stages: PipelineStage[] = ['new', 'contacted', 'replied', 'interested', 'call_booked', 'closed_won', 'closed_lost', 'not_interested']
  const names = [
    'Glamour Studio', 'Royal Fitness', 'Shree Caterers', 'Tech Hub', 'Patel Sweets',
    'Style Salon', 'Elite Gym', 'Fresh Bites', 'Digital Plus', 'Nature Care',
    'Auto Works', 'Bright Academy', 'Quick IT', 'Aroma Kitchen', 'Sunrise Bakery',
    'Power Fit', 'Green Cup', 'Smart Tech', 'Heritage Foods', 'Modern Cuts',
    'Cloud Nine', 'Vivid Colors', 'Nova Clinic', 'Blue Sky Travels', 'Golden Gate',
  ]
  const categories = ['Beauty Salon', 'Gym', 'Restaurant', 'IT Services', 'Sweets', 'Retail', 'Healthcare']

  return Array.from({ length: 25 }, (_, i) => ({
    id: `kn-lead-${i + 1}`,
    scrape_job_id: 'job1',
    business_name: names[i % names.length],
    phone: `91${9800000000 + i * 13}`,
    email: null,
    website: i % 2 === 0 ? `https://example.com` : null,
    address: null,
    city: 'Ahmedabad',
    google_rating: 3.8 + (i % 12) * 0.1,
    review_count: 20 + i * 15,
    category: categories[i % categories.length],
    has_website: i % 2 === 0,
    pipeline_stage: stages[i % stages.length],
    lead_score: 50 + (i % 50),
    facebook_url: null,
    instagram_url: null,
    created_at: new Date(Date.now() - i * 1000 * 60 * 60 * 4).toISOString(),
    updated_at: new Date(Date.now() - i * 1000 * 60 * 60 * 2).toISOString(),
  }))
}

function LeadCard({
  lead,
  onClick,
  isDragging = false,
}: {
  lead: Lead
  onClick: () => void
  isDragging?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({
    id: lead.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg border border-slate-200 p-3 shadow-sm cursor-pointer hover:shadow-md hover:border-slate-300 transition-all group ${
        isDragging ? 'shadow-lg rotate-2 scale-105' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-slate-900 leading-tight truncate">
            {lead.business_name}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{lead.category}</p>
        </div>
        <div
          {...attributes}
          {...listeners}
          className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-2 space-y-1.5">
        {lead.phone && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Phone className="w-3 h-3 shrink-0" />
            <span className="truncate">{formatPhone(lead.phone)}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-xs text-slate-600">{lead.google_rating?.toFixed(1) ?? 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1">
            {lead.has_website && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-green-600 border-green-200">
                <Globe className="w-2.5 h-2.5 mr-0.5" />
                Web
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function KanbanColumn({
  column,
  leads,
  onCardClick,
}: {
  column: Column
  leads: Lead[]
  onCardClick: (lead: Lead) => void
}) {
  return (
    <div className={`flex flex-col rounded-xl border-2 ${column.color} min-w-64 w-64 shrink-0 max-h-full`}>
      {/* Column Header */}
      <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl ${column.headerColor}`}>
        <span className="font-semibold text-sm">{column.label}</span>
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/70 text-xs font-bold">
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-24">
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClick={() => onCardClick(lead)}
            />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
            Drop here
          </div>
        )}
      </div>
    </div>
  )
}

export default function PipelinePage() {
  const { toast } = useToast()
  const [leads, setLeads] = useState<Lead[]>(generateLeads)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const leadsByStage = COLUMNS.reduce<Record<PipelineStage, Lead[]>>((acc, col) => {
    acc[col.id] = leads.filter((l) => l.pipeline_stage === col.id)
    return acc
  }, {} as Record<PipelineStage, Lead[]>)

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null

  const getColumnForLead = (leadId: string): PipelineStage | null => {
    const lead = leads.find((l) => l.id === leadId)
    return lead?.pipeline_stage ?? null
  }

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as string)
  }

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return
    const activeLeadId = active.id as string
    const overId = over.id as string

    const activeStage = getColumnForLead(activeLeadId)
    const overStage = COLUMNS.find((c) => c.id === overId)?.id
      ?? getColumnForLead(overId)

    if (!activeStage || !overStage || activeStage === overStage) return

    setLeads((prev) =>
      prev.map((l) =>
        l.id === activeLeadId ? { ...l, pipeline_stage: overStage as PipelineStage } : l
      )
    )
  }

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveId(null)
    if (!over) return

    const lead = leads.find((l) => l.id === active.id)
    if (!lead) return

    try {
      await fetch(`/api/leads/${lead.id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: lead.pipeline_stage }),
      })
    } catch {
      // Silently ignore in demo
    }
  }

  const handleStageUpdate = (leadId: string, stage: PipelineStage) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, pipeline_stage: stage } : l))
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200 bg-white">
        <h1 className="text-2xl font-bold text-slate-900">Pipeline</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {leads.length} leads across {COLUMNS.length} stages · Drag cards to update stage
        </p>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full pb-4">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                leads={leadsByStage[col.id] ?? []}
                onCardClick={(lead) => {
                  setSelectedLead(lead)
                  setDrawerOpen(true)
                }}
              />
            ))}
          </div>

          <DragOverlay>
            {activeLead && (
              <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xl rotate-3 opacity-95 w-64">
                <p className="font-medium text-sm text-slate-900">{activeLead.business_name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{activeLead.category}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Lead Drawer */}
      <LeadDrawer
        lead={selectedLead}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onStageUpdate={handleStageUpdate}
      />
    </div>
  )
}
