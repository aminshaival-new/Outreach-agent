'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  Filter,
  Download,
  MessageCircle,
  Eye,
  Star,
  Globe,
  ChevronLeft,
  ChevronRight,
  Phone,
  MoreHorizontal,
  CheckSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PipelineBadge } from '@/components/dashboard/PipelineBadge'
import { LeadDrawer } from '@/components/dashboard/LeadDrawer'
import { useToast } from '@/components/ui/use-toast'
import type { Lead, PipelineStage } from '@/lib/types'
import { formatDate, formatPhone } from '@/lib/utils'

const ITEMS_PER_PAGE = 20

const PIPELINE_STAGES: PipelineStage[] = [
  'new', 'contacted', 'replied', 'interested',
  'call_booked', 'closed_won', 'closed_lost', 'not_interested',
]

const CATEGORIES = [
  'Beauty Salon', 'Gym', 'Restaurant', 'Catering', 'IT Services',
  'Sweets & Snacks', 'Retail', 'Education', 'Healthcare', 'Automotive',
]

// Mock leads data
const generateMockLeads = (): Lead[] => {
  const categories = CATEGORIES
  const stages: PipelineStage[] = PIPELINE_STAGES
  const cities = ['Ahmedabad', 'Mumbai', 'Surat', 'Vadodara', 'Rajkot']
  const names = [
    'Glamour Studio', 'Royal Fitness', 'Shree Caterers', 'Tech Solutions', 'Patel Sweets',
    'Modern Salon', 'Elite Gym', 'Fresh Bites', 'Digital Hub', 'Nature Cure',
    'Classic Motors', 'Bright Academy', 'Style Boutique', 'Quick Fix IT', 'Aroma Spice',
    'Sunrise Bakery', 'Power Gym', 'Green Café', 'Smart Solutions', 'Heritage Sweets',
  ]

  return Array.from({ length: 60 }, (_, i) => ({
    id: `lead-${i + 1}`,
    scrape_job_id: `job-${Math.floor(i / 10) + 1}`,
    business_name: `${names[i % names.length]} ${i > 19 ? (i % 5) + 1 : ''}`.trim(),
    phone: i % 4 !== 0 ? `91${9800000000 + i * 7}` : null,
    email: i % 3 === 0 ? `contact${i}@example.com` : null,
    website: i % 2 === 0 ? `https://example${i}.com` : null,
    address: `${100 + i} Main St, ${cities[i % cities.length]}`,
    city: cities[i % cities.length],
    google_rating: 3.5 + (i % 15) * 0.1,
    review_count: 10 + i * 7,
    category: categories[i % categories.length],
    has_website: i % 2 === 0,
    pipeline_stage: stages[i % stages.length],
    lead_score: 40 + (i % 60),
    facebook_url: null,
    instagram_url: null,
    created_at: new Date(Date.now() - i * 1000 * 60 * 60 * 3).toISOString(),
    updated_at: new Date(Date.now() - i * 1000 * 60 * 60 * 2).toISOString(),
  }))
}

const ALL_LEADS = generateMockLeads()

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-slate-400 text-xs">N/A</span>
  const full = Math.round(rating)
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`w-3 h-3 ${i < full ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 fill-slate-200'}`}
          />
        ))}
      </div>
      <span className="text-xs text-slate-500">{rating.toFixed(1)}</span>
    </div>
  )
}

export default function LeadsPage() {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [websiteFilter, setWebsiteFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const filteredLeads = useMemo(() => {
    return ALL_LEADS.filter((lead) => {
      const q = search.toLowerCase()
      if (
        q &&
        !lead.business_name.toLowerCase().includes(q) &&
        !lead.phone?.includes(q) &&
        !lead.city?.toLowerCase().includes(q)
      ) {
        return false
      }
      if (stageFilter !== 'all' && lead.pipeline_stage !== stageFilter) return false
      if (categoryFilter !== 'all' && lead.category !== categoryFilter) return false
      if (websiteFilter === 'yes' && !lead.has_website) return false
      if (websiteFilter === 'no' && lead.has_website) return false
      return true
    })
  }, [search, stageFilter, categoryFilter, websiteFilter])

  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE)
  const paginatedLeads = filteredLeads.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedLeads.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginatedLeads.map((l) => l.id)))
    }
  }

  const handleExportCSV = () => {
    const leads = selectedIds.size > 0
      ? filteredLeads.filter((l) => selectedIds.has(l.id))
      : filteredLeads

    const headers = ['Business Name', 'Phone', 'Email', 'Website', 'City', 'Category', 'Rating', 'Reviews', 'Stage', 'Score', 'Created']
    const rows = leads.map((l) => [
      l.business_name,
      l.phone ?? '',
      l.email ?? '',
      l.website ?? '',
      l.city ?? '',
      l.category ?? '',
      l.google_rating?.toFixed(1) ?? '',
      l.review_count.toString(),
      l.pipeline_stage,
      l.lead_score.toString(),
      formatDate(l.created_at),
    ])

    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: `Exported ${leads.length} leads` })
  }

  const openLeadDrawer = (lead: Lead) => {
    setSelectedLead(lead)
    setDrawerOpen(true)
  }

  const handleStageUpdate = (leadId: string, stage: PipelineStage) => {
    const lead = ALL_LEADS.find((l) => l.id === leadId)
    if (lead) lead.pipeline_stage = stage
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {filteredLeads.length.toLocaleString()} leads
            {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="outline" size="sm" className="gap-2">
              <CheckSquare className="w-4 h-4" />
              Bulk Update Stage
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, phone, city..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        <Select value={stageFilter} onValueChange={(v) => { setStageFilter(v); setPage(1) }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {PIPELINE_STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1) }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={websiteFilter} onValueChange={(v) => { setWebsiteFilter(v); setPage(1) }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Website" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Has Website</SelectItem>
            <SelectItem value="no">No Website</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-10 pl-4">
                <input
                  type="checkbox"
                  checked={selectedIds.size === paginatedLeads.length && paginatedLeads.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300"
                />
              </TableHead>
              <TableHead>Business Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Reviews</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLeads.map((lead) => (
              <TableRow
                key={lead.id}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => openLeadDrawer(lead)}
              >
                <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(lead.id)}
                    onChange={() => toggleSelect(lead.id)}
                    className="rounded border-slate-300"
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm text-slate-900">{lead.business_name}</p>
                    <p className="text-xs text-slate-500">{lead.category} · {lead.city}</p>
                  </div>
                </TableCell>
                <TableCell>
                  {lead.phone ? (
                    <a
                      href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-sm text-green-600 hover:underline"
                    >
                      <Phone className="w-3 h-3" />
                      {formatPhone(lead.phone)}
                    </a>
                  ) : (
                    <span className="text-slate-400 text-xs">No phone</span>
                  )}
                </TableCell>
                <TableCell>
                  <StarRating rating={lead.google_rating} />
                </TableCell>
                <TableCell>
                  <span className="text-sm text-slate-600">{lead.review_count.toLocaleString()}</span>
                </TableCell>
                <TableCell>
                  {lead.has_website ? (
                    <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">
                      <Globe className="w-3 h-3 mr-1" />
                      Yes
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-slate-500">
                      No
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <PipelineBadge stage={lead.pipeline_stage} />
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {formatDate(lead.created_at)}
                </TableCell>
                <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openLeadDrawer(lead)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      {lead.phone && (
                        <DropdownMenuItem asChild>
                          <a
                            href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Send WhatsApp
                          </a>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          toast({ title: 'Stage update', description: 'Open drawer to update stage' })
                          openLeadDrawer(lead)
                        }}
                      >
                        Update Stage
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {paginatedLeads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No leads found</p>
            <p className="text-slate-400 text-sm mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filteredLeads.length)} of {filteredLeads.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = page <= 3 ? i + 1 : page - 2 + i
                if (pageNum > totalPages) return null
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? 'default' : 'outline'}
                    size="sm"
                    className="w-9"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

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
