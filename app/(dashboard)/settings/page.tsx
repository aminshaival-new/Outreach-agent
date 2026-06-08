'use client'

import { useState } from 'react'
import { Save, Phone, Key, MessageCircle, BellRing, Zap, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'

const defaultTemplates = {
  initial: `Hi {business_name}! 👋

We noticed your business on Google and wanted to reach out. We help {category} businesses like yours get more customers through WhatsApp marketing and SEO.

We've helped similar businesses in {city} grow their customer base by 30-50% in just 3 months.

Would you be open to a quick 10-minute chat? 😊`,

  followup: `Hi! Following up on my earlier message about digital marketing for {business_name}.

We have a special offer for {category} businesses this month — first month completely free!

Interested? Just reply "Yes" and we'll set up a quick call. 📲`,

  interested: `Amazing! Thank you for your interest, {business_name}! 🙌

I'd love to schedule a quick call to discuss how we can help you:
✅ Get more customers through WhatsApp
✅ Improve your Google ranking
✅ Build your online presence

When works best for you? Morning or evening?`,
}

export default function SettingsPage() {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    whatsapp_phone: '919727686181',
    bot_phone: '916357111161',
    green_api_instance: '7107645932',
    green_api_token: '••••••••••••••••',
    openai_api_key: '••••••••••••••••',
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    scrape_delay_ms: '2000',
    max_leads_per_job: '100',
    auto_outreach: true,
    auto_followup: true,
    followup_delay_hours: '48',
  })
  const [templates, setTemplates] = useState(defaultTemplates)

  const handleSave = async (section: string) => {
    setSaving(true)
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, settings, templates }),
      })
      toast({ title: 'Settings saved', description: `${section} settings updated successfully` })
    } catch {
      toast({ title: 'Failed to save settings', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Configure your Local Lead AI system</p>
      </div>

      <Tabs defaultValue="whatsapp">
        <TabsList className="mb-6">
          <TabsTrigger value="whatsapp" className="gap-2">
            <Phone className="w-4 h-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <Key className="w-4 h-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <MessageCircle className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-2">
            <Zap className="w-4 h-4" />
            Automation
          </TabsTrigger>
        </TabsList>

        {/* WhatsApp Settings */}
        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Configuration</CardTitle>
              <CardDescription>
                Configure your Green API credentials and phone numbers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>Receive Alerts On (Personal Number)</Label>
                  <Input
                    value={settings.whatsapp_phone}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, whatsapp_phone: e.target.value }))
                    }
                    placeholder="919727686181"
                  />
                  <p className="text-xs text-slate-500">Number that receives all alerts and lead notifications</p>
                </div>
                <div className="space-y-2">
                  <Label>Bot Command Number (Work Number)</Label>
                  <Input
                    value={settings.bot_phone}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, bot_phone: e.target.value }))
                    }
                    placeholder="916357111161"
                  />
                  <p className="text-xs text-slate-500">Number you send commands from</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>Green API Instance ID</Label>
                  <Input
                    value={settings.green_api_instance}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, green_api_instance: e.target.value }))
                    }
                    placeholder="7107645932"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Green API Token</Label>
                  <Input
                    type="password"
                    value={settings.green_api_token}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, green_api_token: e.target.value }))
                    }
                    placeholder="Your Green API token"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-green-700 font-medium">WhatsApp bot is connected and running</span>
                <Badge variant="outline" className="ml-auto text-xs text-green-700 border-green-300">
                  Live
                </Badge>
              </div>

              <Button onClick={() => handleSave('WhatsApp')} disabled={saving} className="gap-2">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save WhatsApp Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys */}
        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>API Keys & Integrations</CardTitle>
              <CardDescription>
                Manage your third-party API credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>OpenAI API Key</Label>
                <Input
                  type="password"
                  value={settings.openai_api_key}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, openai_api_key: e.target.value }))
                  }
                  placeholder="sk-..."
                />
                <p className="text-xs text-slate-500">Used for AI-powered response generation</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Supabase URL</Label>
                <Input
                  value={settings.supabase_url}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, supabase_url: e.target.value }))
                  }
                  placeholder="https://your-project.supabase.co"
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>Max Leads Per Scrape Job</Label>
                  <Input
                    type="number"
                    value={settings.max_leads_per_job}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, max_leads_per_job: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Scrape Delay (ms)</Label>
                  <Input
                    type="number"
                    value={settings.scrape_delay_ms}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, scrape_delay_ms: e.target.value }))
                    }
                  />
                  <p className="text-xs text-slate-500">Delay between requests to avoid rate limiting</p>
                </div>
              </div>

              <Button onClick={() => handleSave('API')} disabled={saving} className="gap-2">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save API Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Message Templates */}
        <TabsContent value="templates">
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Initial Outreach Message</CardTitle>
                <CardDescription>
                  First message sent to new leads. Variables: {'{business_name}'}, {'{category}'}, {'{city}'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={8}
                  value={templates.initial}
                  onChange={(e) => setTemplates((t) => ({ ...t, initial: e.target.value }))}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Follow-up Message</CardTitle>
                <CardDescription>
                  Sent if no reply after the configured delay
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={7}
                  value={templates.followup}
                  onChange={(e) => setTemplates((t) => ({ ...t, followup: e.target.value }))}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Interested Response</CardTitle>
                <CardDescription>
                  Sent when a lead shows interest
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={8}
                  value={templates.interested}
                  onChange={(e) => setTemplates((t) => ({ ...t, interested: e.target.value }))}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>

            <Button onClick={() => handleSave('Templates')} disabled={saving} className="gap-2">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Templates
            </Button>
          </div>
        </TabsContent>

        {/* Automation */}
        <TabsContent value="automation">
          <Card>
            <CardHeader>
              <CardTitle>Automation Settings</CardTitle>
              <CardDescription>
                Configure automated outreach and follow-up behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">Auto Outreach</p>
                  <p className="text-sm text-slate-500">
                    Automatically send initial message to new leads
                  </p>
                </div>
                <button
                  onClick={() => setSettings((s) => ({ ...s, auto_outreach: !s.auto_outreach }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.auto_outreach ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      settings.auto_outreach ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">Auto Follow-up</p>
                  <p className="text-sm text-slate-500">
                    Automatically send follow-up if no reply
                  </p>
                </div>
                <button
                  onClick={() => setSettings((s) => ({ ...s, auto_followup: !s.auto_followup }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.auto_followup ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      settings.auto_followup ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {settings.auto_followup && (
                <div className="space-y-2 pl-4 border-l-2 border-blue-200">
                  <Label>Follow-up Delay (hours)</Label>
                  <Input
                    type="number"
                    value={settings.followup_delay_hours}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, followup_delay_hours: e.target.value }))
                    }
                    className="max-w-32"
                  />
                  <p className="text-xs text-slate-500">
                    Send follow-up message after this many hours with no reply
                  </p>
                </div>
              )}

              <Separator />

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <BellRing className="w-4 h-4 text-amber-600" />
                  <span className="font-medium text-amber-800">GitHub Actions Schedule</span>
                </div>
                <p className="text-xs text-amber-700">
                  Morning Briefing: 7:30 AM IST · Price Monitor: Every 5 min (9AM–3:30PM) ·
                  ATLAS Scanner: 9:30AM, 12PM, 2PM IST
                </p>
              </div>

              <Button onClick={() => handleSave('Automation')} disabled={saving} className="gap-2">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Automation Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
