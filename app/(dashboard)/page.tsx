'use client'

import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts'
import {
  Users,
  MessageCircle,
  Reply,
  Star,
  Phone,
  TrendingUp,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { PipelineBadge } from '@/components/dashboard/PipelineBadge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { DashboardStats, Lead, ScrapeJob, PipelineStage } from '@/lib/types'
import { formatDate, formatRelativeTime } from '@/lib/utils'

// Mock data for demonstration
const mockStats: DashboardStats = {
  leads_scraped: 1284,
  messages_sent: 847,
  replies_received: 163,
  interested: 48,
  calls_booked: 21,
  closed_deals: 9,
  revenue: 135000,
  leads_by_stage: {
    new: 437,
    contacted: 410,
    replied: 163,
    interested: 48,
    call_booked: 21,
    closed_won: 9,
    closed_lost: 124,
    not_interested: 72,
  },
  leads_per_day: [
    { date: '2026-06-02', count: 120 },
    { date: '2026-06-03', count: 185 },
    { date: '2026-06-04', count: 67 },
    { date: '2026-06-05', count: 203 },
    { date: '2026-06-06', count: 145 },
    { date: '2026-06-07', count: 290 },
    { date: '2026-06-08', count: 274 },
  ],
}

const mockRecentLeads: Lead[] = [
  {
    id: '1',
    scrape_job_id: 'job1',
    business_name: 'Glamour Studio & Salon',
    phone: '919898765432',
    email: null,
    website: null,
    address: 'South Bopal, Ahmedabad',
    city: 'Ahmedabad',
    google_rating: 4.3,
    review_count: 127,
    category: 'Beauty Salon',
    has_website: false,
    pipeline_stage: 'new',
    lead_score: 72,
    facebook_url: null,
    instagram_url: null,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: '2',
    scrape_job_id: 'job1',
    business_name: 'Royal Fitness Club',
    phone: '919876543210',
    email: 'info@royalfitness.com',
    website: 'https://royalfitness.com',
    address: 'Prahlad Nagar, Ahmedabad',
    city: 'Ahmedabad',
    google_rating: 4.7,
    review_count: 312,
    category: 'Gym',
    has_website: true,
    pipeline_stage: 'contacted',
    lead_score: 88,
    facebook_url: null,
    instagram_url: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: '3',
    scrape_job_id: 'job2',
    business_name: 'Shree Caterers',
    phone: '919712345678',
    email: null,
    website: null,
    address: 'Maninagar, Ahmedabad',
    city: 'Ahmedabad',
    google_rating: 4.1,
    review_count: 84,
    category: 'Catering',
    has_website: false,
    pipeline_stage: 'replied',
    lead_score: 65,
    facebook_url: null,
    instagram_url: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: '4',
    scrape_job_id: 'job2',
    business_name: 'TechCare Solutions',
    phone: '919867542310',
    email: 'hello@techcare.in',
    website: 'https://techcare.in',
    address: 'SG Highway, Ahmedabad',
    city: 'Ahmedabad',
    google_rating: 4.5,
    review_count: 201,
    category: 'IT Services',
    has_website: true,
    pipeline_stage: 'interested',
    lead_score: 91,
    facebook_url: null,
    instagram_url: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
  {
    id: '5',
    scrape_job_id: 'job3',
    business_name: 'Patel Sweet House',
    phone: '919988776655',
    email: null,
    website: null,
    address: 'Vastral, Ahmedabad',
    city: 'Ahmedabad',
    google_rating: 4.6,
    review_count: 456,
    category: 'Sweets & Snacks',
    has_website: false,
    pipeline_stage: 'call_booked',
    lead_score: 78,
    facebook_url: null,
    instagram_url: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
]

const mockScrapeJobs: ScrapeJob[] = [
  {
    id: 'job1',
    industry: 'Salon',
    location: 'South Bopal, Ahmedabad',
    raw_query: 'Salon in South Bopal',
    status: 'completed',
    leads_count: 47,
    drive_file_url: null,
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    completed_at: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
  },
  {
    id: 'job2',
    industry: 'Restaurant',
    location: 'Maninagar, Ahmedabad',
    raw_query: 'Restaurant in Maninagar',
    status: 'completed',
    leads_count: 63,
    drive_file_url: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    completed_at: new Date(Date.now() - 1000 * 60 * 60 * 2.8).toISOString(),
  },
  {
    id: 'job3',
    industry: 'Gym',
    location: 'Prahlad Nagar, Ahmedabad',
    raw_query: 'Gym in Prahlad Nagar',
    status: 'running',
    leads_count: 0,
    drive_file_url: null,
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    completed_at: null,
  },
  {
    id: 'job4',
    industry: 'IT Services',
    location: 'SG Highway, Ahmedabad',
    raw_query: 'IT company near SG Highway',
    status: 'failed',
    leads_count: 0,
    drive_file_url: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    completed_at: null,
  },
]

const STAGE_CHART_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  replied: 'Replied',
  interested: 'Interested',
  call_booked: 'Call Booked',
  closed_won: 'Won',
  closed_lost: 'Lost',
  not_interested: 'Not Interested',
}

function StatusBadge({ status }: { status: ScrapeJob['status'] }) {
  const config = {
    pending: { label: 'Pending', className: 'bg-slate-100 text-slate-600', icon: <Clock className="w-3 h-3" /> },
    running: { label: 'Running', className: 'bg-blue-100 text-blue-700', icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="w-3 h-3" /> },
    failed: { label: 'Failed', className: 'bg-red-100 text-red-700', icon: <AlertCircle className="w-3 h-3" /> },
  }
  const { label, className, icon } = config[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {icon}
      {label}
    </span>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-lg" />
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json()
    },
    initialData: mockStats,
  })

  const stageChartData = stats
    ? Object.entries(stats.leads_by_stage).map(([stage, count]) => ({
        stage: STAGE_CHART_LABELS[stage] ?? stage,
        count,
      }))
    : []

  const leadsPerDayData = stats?.leads_per_day?.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  })) ?? []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Overview of your lead generation activity</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatsCard
            title="Leads Scraped"
            value={stats?.leads_scraped ?? 0}
            icon={<Users className="w-5 h-5" />}
            color="blue"
            change={12}
          />
          <StatsCard
            title="Messages Sent"
            value={stats?.messages_sent ?? 0}
            icon={<MessageCircle className="w-5 h-5" />}
            color="purple"
            change={8}
          />
          <StatsCard
            title="Replies Received"
            value={stats?.replies_received ?? 0}
            icon={<Reply className="w-5 h-5" />}
            color="yellow"
            change={-3}
          />
          <StatsCard
            title="Interested"
            value={stats?.interested ?? 0}
            icon={<Star className="w-5 h-5" />}
            color="orange"
            change={15}
          />
          <StatsCard
            title="Calls Booked"
            value={stats?.calls_booked ?? 0}
            icon={<Phone className="w-5 h-5" />}
            color="green"
            change={5}
          />
          <StatsCard
            title="Closed Deals"
            value={stats?.closed_deals ?? 0}
            icon={<TrendingUp className="w-5 h-5" />}
            color="green"
            change={0}
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Leads by Stage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Leads by Pipeline Stage</CardTitle>
            <CardDescription>Distribution across all stages</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stageChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  angle={-30}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Leads Scraped Per Day */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Leads Scraped (Last 7 Days)</CardTitle>
            <CardDescription>Daily scraping activity</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={leadsPerDayData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#leadsGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent Leads</CardTitle>
            <CardDescription>Last 10 leads scraped</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Business</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right pr-6">Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockRecentLeads.map((lead) => (
                  <TableRow key={lead.id} className="cursor-pointer">
                    <TableCell className="pl-6">
                      <div>
                        <p className="font-medium text-sm text-slate-900">{lead.business_name}</p>
                        <p className="text-xs text-slate-500">{lead.category}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <PipelineBadge stage={lead.pipeline_stage as PipelineStage} />
                    </TableCell>
                    <TableCell className="text-right text-xs text-slate-500 pr-6">
                      {formatRelativeTime(lead.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Scrape Jobs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent Scrape Jobs</CardTitle>
            <CardDescription>Latest scraping activity</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Query</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockScrapeJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="pl-6">
                      <div>
                        <p className="font-medium text-sm text-slate-900">{job.industry}</p>
                        <p className="text-xs text-slate-500">{job.location}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-sm">{job.leads_count}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={job.status} />
                    </TableCell>
                    <TableCell className="text-right text-xs text-slate-500 pr-6">
                      {formatRelativeTime(job.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
