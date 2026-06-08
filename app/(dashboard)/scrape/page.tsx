'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  MapPin,
  Building2,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import type { ScrapeJob } from '@/lib/types'
import { formatDate, formatRelativeTime } from '@/lib/utils'

const mockJobs: ScrapeJob[] = [
  {
    id: 'job-1',
    industry: 'Salon',
    location: 'South Bopal, Ahmedabad',
    raw_query: 'Salon in South Bopal',
    status: 'completed',
    leads_count: 47,
    drive_file_url: 'https://drive.google.com/file/d/abc',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    completed_at: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
  },
  {
    id: 'job-2',
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
    id: 'job-3',
    industry: 'Gym',
    location: 'Prahlad Nagar, Ahmedabad',
    raw_query: 'Gym near Prahlad Nagar',
    status: 'completed',
    leads_count: 31,
    drive_file_url: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    completed_at: new Date(Date.now() - 1000 * 60 * 60 * 7.5).toISOString(),
  },
  {
    id: 'job-4',
    industry: 'IT Services',
    location: 'SG Highway, Ahmedabad',
    raw_query: 'IT company near SG Highway Ahmedabad',
    status: 'failed',
    leads_count: 0,
    drive_file_url: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    completed_at: null,
  },
  {
    id: 'job-5',
    industry: 'Salon',
    location: 'Vastrapur, Ahmedabad',
    raw_query: 'Beauty salon Vastrapur',
    status: 'completed',
    leads_count: 28,
    drive_file_url: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    completed_at: new Date(Date.now() - 1000 * 60 * 60 * 23.5).toISOString(),
  },
  {
    id: 'job-6',
    industry: 'Dental Clinic',
    location: 'Satellite, Ahmedabad',
    raw_query: 'Dental clinic in Satellite Ahmedabad',
    status: 'completed',
    leads_count: 19,
    drive_file_url: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    completed_at: new Date(Date.now() - 1000 * 60 * 60 * 47).toISOString(),
  },
]

const SCRAPE_EXAMPLES = [
  'Salon in South Bopal',
  'Restaurant near Maninagar',
  'Gym in Prahlad Nagar',
  'IT company on SG Highway',
  'Dental clinic in Satellite',
  'Sweet shop in Vastral',
  'Catering service in Navrangpura',
]

function StatusBadge({ status }: { status: ScrapeJob['status'] }) {
  const config: Record<
    ScrapeJob['status'],
    { label: string; className: string; icon: React.ReactNode }
  > = {
    pending: {
      label: 'Pending',
      className: 'bg-slate-100 text-slate-600',
      icon: <Clock className="w-3 h-3" />,
    },
    running: {
      label: 'Running',
      className: 'bg-blue-100 text-blue-700',
      icon: <RefreshCw className="w-3 h-3 animate-spin" />,
    },
    completed: {
      label: 'Completed',
      className: 'bg-green-100 text-green-700',
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    failed: {
      label: 'Failed',
      className: 'bg-red-100 text-red-700',
      icon: <AlertCircle className="w-3 h-3" />,
    },
  }

  const { label, className, icon } = config[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {icon}
      {label}
    </span>
  )
}

export default function ScrapePage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [runningJob, setRunningJob] = useState<{
    id: string
    query: string
    progress: number
  } | null>(null)
  const [jobs, setJobs] = useState<ScrapeJob[]>(mockJobs)

  const handleScrape = async () => {
    if (!query.trim()) {
      toast({ title: 'Please enter a query', variant: 'destructive' })
      return
    }

    const jobId = `job-${Date.now()}`
    setRunningJob({ id: jobId, query: query.trim(), progress: 0 })

    // Simulate progress
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 15
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)

        const leadsCount = Math.floor(20 + Math.random() * 60)

        // Parse industry/location from query
        const parts = query.split(/\s+in\s+|\s+near\s+|\s+at\s+/i)
        const industry = parts[0]?.trim() ?? query
        const location = parts[1]?.trim() ?? 'Local Area'

        const newJob: ScrapeJob = {
          id: jobId,
          industry,
          location,
          raw_query: query.trim(),
          status: 'completed',
          leads_count: leadsCount,
          drive_file_url: null,
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        }

        setJobs((prev) => [newJob, ...prev])
        setRunningJob(null)
        setQuery('')

        toast({
          title: 'Scrape completed!',
          description: `Found ${leadsCount} leads for "${query.trim()}"`,
        })
      } else {
        setRunningJob((prev) => (prev ? { ...prev, progress } : null))
      }
    }, 400)

    // Actually call the API
    try {
      await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      })
    } catch {
      // Ignore in demo mode
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Scrape Leads</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Trigger a manual scrape to find new leads from Google Maps
        </p>
      </div>

      {/* Scrape Trigger Card */}
      <Card className="border-2 border-dashed border-blue-200 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="text-lg">Start a New Scrape</CardTitle>
          <CardDescription>
            Describe what businesses to find and where. Be specific for better results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="e.g., Salon in South Bopal"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !runningJob) handleScrape()
                  }}
                  className="pl-10 h-12 text-base bg-white"
                  disabled={!!runningJob}
                />
              </div>
              <Button
                size="lg"
                className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white gap-2 shrink-0"
                onClick={handleScrape}
                disabled={!!runningJob || !query.trim()}
              >
                {runningJob ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Scrape Now
                  </>
                )}
              </Button>
            </div>

            {/* Example Queries */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-slate-500 self-center">Try:</span>
              {SCRAPE_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setQuery(ex)}
                  className="text-xs px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                  disabled={!!runningJob}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Running Job Status */}
          {runningJob && (
            <div className="mt-5 p-4 bg-white rounded-xl border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                  <span className="font-medium text-sm text-slate-900">
                    Scraping: &ldquo;{runningJob.query}&rdquo;
                  </span>
                </div>
                <span className="text-sm font-semibold text-blue-600">
                  {Math.round(runningJob.progress)}%
                </span>
              </div>
              <Progress value={runningJob.progress} className="h-2" />
              <div className="mt-2 space-y-1">
                {runningJob.progress < 25 && (
                  <p className="text-xs text-slate-500">Connecting to Google Maps...</p>
                )}
                {runningJob.progress >= 25 && runningJob.progress < 60 && (
                  <p className="text-xs text-slate-500">Extracting business listings...</p>
                )}
                {runningJob.progress >= 60 && runningJob.progress < 85 && (
                  <p className="text-xs text-slate-500">Fetching contact details & ratings...</p>
                )}
                {runningJob.progress >= 85 && (
                  <p className="text-xs text-slate-500">Saving leads to database...</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Jobs',
            value: jobs.length,
            color: 'text-slate-900',
          },
          {
            label: 'Completed',
            value: jobs.filter((j) => j.status === 'completed').length,
            color: 'text-green-700',
          },
          {
            label: 'Total Leads Found',
            value: jobs.reduce((sum, j) => sum + j.leads_count, 0),
            color: 'text-blue-700',
          },
          {
            label: 'Failed Jobs',
            value: jobs.filter((j) => j.status === 'failed').length,
            color: 'text-red-600',
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Jobs Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Scrape History</CardTitle>
              <CardDescription>All past scrape jobs and their results</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="pl-6">Query</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Leads Found</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right pr-6">Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => {
                const duration =
                  job.completed_at && job.status === 'completed'
                    ? Math.round(
                        (new Date(job.completed_at).getTime() -
                          new Date(job.created_at).getTime()) /
                          1000
                      )
                    : null

                return (
                  <TableRow key={job.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                        <div>
                          <p className="font-medium text-sm text-slate-900">{job.industry}</p>
                          <p className="text-xs text-slate-500 truncate max-w-48">{job.raw_query}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-36">{job.location}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-semibold text-sm ${
                          job.leads_count > 0 ? 'text-green-700' : 'text-slate-400'
                        }`}
                      >
                        {job.leads_count > 0 ? `+${job.leads_count}` : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={job.status} />
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-500">
                        {duration != null ? `${duration}s` : '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs text-slate-500 pr-6">
                      {formatRelativeTime(job.created_at)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
