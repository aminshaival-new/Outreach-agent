'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PipelineBadge } from './PipelineBadge'
import { useToast } from '@/components/ui/use-toast'
import type { Lead, OutreachMessage, PipelineStage } from '@/lib/types'
import { formatDate, formatPhone } from '@/lib/utils'
import {
  Phone,
  Mail,
  Globe,
  MapPin,
  Star,
  MessageCircle,
  Building2,
  ExternalLink,
  Send,
} from 'lucide-react'

const PIPELINE_STAGES: { value: PipelineStage; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'replied', label: 'Replied' },
  { value: 'interested', label: 'Interested' },
  { value: 'call_booked', label: 'Call Booked' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
  { value: 'not_interested', label: 'Not Interested' },
]

const mockMessages: OutreachMessage[] = [
  {
    id: '1',
    lead_id: '',
    message: 'Hi! We noticed your business could benefit from more online visibility. We help local businesses like yours get more customers through digital marketing. Interested in a free consultation?',
    direction: 'outbound',
    sent_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    status: 'read',
  },
  {
    id: '2',
    lead_id: '',
    message: 'Thanks for reaching out! Can you tell me more about your services and pricing?',
    direction: 'inbound',
    sent_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    status: 'read',
  },
  {
    id: '3',
    lead_id: '',
    message: 'Absolutely! We offer SEO, social media management, and WhatsApp marketing starting at ₹5,000/month. We can schedule a call to discuss your specific needs.',
    direction: 'outbound',
    sent_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    status: 'delivered',
  },
]

interface LeadDrawerProps {
  lead: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onStageUpdate?: (leadId: string, stage: PipelineStage) => void
}

export function LeadDrawer({ lead, open, onOpenChange, onStageUpdate }: LeadDrawerProps) {
  const [notes, setNotes] = useState('')
  const [selectedStage, setSelectedStage] = useState<PipelineStage>(lead?.pipeline_stage ?? 'new')
  const [isSavingStage, setIsSavingStage] = useState(false)
  const { toast } = useToast()

  const messages = lead ? mockMessages.map((m) => ({ ...m, lead_id: lead.id })) : []

  const handleStageChange = async (stage: PipelineStage) => {
    if (!lead) return
    setSelectedStage(stage)
    setIsSavingStage(true)
    try {
      await fetch(`/api/leads/${lead.id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      })
      onStageUpdate?.(lead.id, stage)
      toast({ title: 'Stage updated', description: `Lead moved to ${stage.replace('_', ' ')}` })
    } catch {
      toast({ title: 'Failed to update stage', variant: 'destructive' })
    } finally {
      setIsSavingStage(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!lead || !notes.trim()) return
    try {
      await fetch(`/api/leads/${lead.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      toast({ title: 'Notes saved' })
    } catch {
      toast({ title: 'Failed to save notes', variant: 'destructive' })
    }
  }

  if (!lead) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl p-0 flex flex-col"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <SheetTitle className="text-xl">{lead.business_name}</SheetTitle>
              <SheetDescription className="flex items-center gap-1 mt-1">
                <Building2 className="w-3 h-3" />
                {lead.category ?? 'Unknown Category'}
              </SheetDescription>
            </div>
            <PipelineBadge stage={lead.pipeline_stage} />
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-6">
            {/* Contact Info */}
            <section>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Contact Information</h3>
              <div className="space-y-2">
                {lead.phone && (
                  <a
                    href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-slate-600 hover:text-green-600 transition-colors group"
                  >
                    <div className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg group-hover:bg-green-50">
                      <Phone className="w-4 h-4" />
                    </div>
                    <span>{formatPhone(lead.phone)}</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                  </a>
                )}
                {lead.email && (
                  <a
                    href={`mailto:${lead.email}`}
                    className="flex items-center gap-3 text-sm text-slate-600 hover:text-blue-600 transition-colors group"
                  >
                    <div className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg group-hover:bg-blue-50">
                      <Mail className="w-4 h-4" />
                    </div>
                    <span>{lead.email}</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                  </a>
                )}
                {lead.website && (
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-slate-600 hover:text-blue-600 transition-colors group"
                  >
                    <div className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg group-hover:bg-blue-50">
                      <Globe className="w-4 h-4" />
                    </div>
                    <span className="truncate">{lead.website}</span>
                    <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100" />
                  </a>
                )}
                {lead.address && (
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <div className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span>{lead.address}</span>
                  </div>
                )}
              </div>
            </section>

            <Separator />

            {/* Rating & Score */}
            <section>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Business Metrics</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="font-bold text-slate-900">
                      {lead.google_rating?.toFixed(1) ?? 'N/A'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Rating</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="font-bold text-slate-900 mb-1">{lead.review_count.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Reviews</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="font-bold text-slate-900 mb-1">{lead.lead_score}</p>
                  <p className="text-xs text-slate-500">Lead Score</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant={lead.has_website ? 'default' : 'outline'} className="text-xs">
                  {lead.has_website ? 'Has Website' : 'No Website'}
                </Badge>
                {lead.facebook_url && (
                  <Badge variant="outline" className="text-xs">
                    Facebook
                  </Badge>
                )}
                {lead.instagram_url && (
                  <Badge variant="outline" className="text-xs">
                    Instagram
                  </Badge>
                )}
              </div>
            </section>

            <Separator />

            {/* Stage Update */}
            <section>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Pipeline Stage</h3>
              <Select
                value={selectedStage}
                onValueChange={(v) => handleStageChange(v as PipelineStage)}
                disabled={isSavingStage}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE_STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </section>

            <Separator />

            {/* Conversation History */}
            <section>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Conversation History
              </h3>
              <div className="space-y-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No messages yet.</p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                          msg.direction === 'outbound'
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-slate-100 text-slate-900 rounded-bl-none'
                        }`}
                      >
                        <p className="leading-relaxed">{msg.message}</p>
                        <p
                          className={`text-xs mt-1 ${
                            msg.direction === 'outbound' ? 'text-blue-200' : 'text-slate-400'
                          }`}
                        >
                          {formatDate(msg.sent_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <Separator />

            {/* Notes */}
            <section>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Notes</h3>
              <Textarea
                placeholder="Add notes about this lead..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
              <Button
                size="sm"
                className="mt-2"
                onClick={handleSaveNotes}
                disabled={!notes.trim()}
              >
                <Send className="w-3 h-3 mr-1" />
                Save Notes
              </Button>
            </section>

            {/* Metadata */}
            <div className="text-xs text-slate-400 pb-2">
              <p>Created: {formatDate(lead.created_at)}</p>
              <p>Updated: {formatDate(lead.updated_at)}</p>
              <p>ID: {lead.id}</p>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
