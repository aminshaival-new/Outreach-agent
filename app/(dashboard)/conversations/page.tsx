'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Search,
  Send,
  Bot,
  User,
  CheckCheck,
  Check,
  Clock,
  AlertCircle,
  MessageCircle,
  Phone,
  MoreVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import type { OutreachMessage, Conversation } from '@/lib/types'
import { formatRelativeTime, formatPhone } from '@/lib/utils'

// Mock conversation data
const generateMockConversations = (): Conversation[] => [
  {
    id: 'conv-1',
    lead_id: 'lead-1',
    business_name: 'Glamour Studio & Salon',
    phone: '919898765432',
    last_message: 'Thanks for reaching out! Can you tell me more about your services?',
    last_message_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    unread_count: 2,
    status: 'active',
    ai_handling: true,
    messages: [
      {
        id: 'm1',
        lead_id: 'lead-1',
        message: 'Hi! We noticed your salon could benefit from more online visibility. We help local businesses like yours get more customers through digital marketing. Interested in a free consultation?',
        direction: 'outbound',
        sent_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        status: 'read',
      },
      {
        id: 'm2',
        lead_id: 'lead-1',
        message: 'Thanks for reaching out! Can you tell me more about your services and pricing?',
        direction: 'inbound',
        sent_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        status: 'read',
      },
      {
        id: 'm3',
        lead_id: 'lead-1',
        message: 'Absolutely! We offer SEO, social media management, and WhatsApp marketing starting at ₹5,000/month. We can schedule a call to discuss your specific needs.',
        direction: 'outbound',
        sent_at: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
        status: 'read',
      },
      {
        id: 'm4',
        lead_id: 'lead-1',
        message: 'That sounds interesting. What results have you achieved for other salons?',
        direction: 'inbound',
        sent_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        status: 'read',
      },
      {
        id: 'm5',
        lead_id: 'lead-1',
        message: 'Thanks for reaching out! Can you tell me more about your services?',
        direction: 'inbound',
        sent_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        status: 'delivered',
      },
    ],
  },
  {
    id: 'conv-2',
    lead_id: 'lead-2',
    business_name: 'Royal Fitness Club',
    phone: '919876543210',
    last_message: 'We are interested! Can we schedule a call for tomorrow?',
    last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    unread_count: 1,
    status: 'active',
    ai_handling: false,
    messages: [
      {
        id: 'm6',
        lead_id: 'lead-2',
        message: 'Hello! We help gyms and fitness centers grow their membership using targeted WhatsApp campaigns. Would you be open to a quick 10-minute chat?',
        direction: 'outbound',
        sent_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        status: 'read',
      },
      {
        id: 'm7',
        lead_id: 'lead-2',
        message: 'We are interested! Can we schedule a call for tomorrow?',
        direction: 'inbound',
        sent_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        status: 'delivered',
      },
    ],
  },
  {
    id: 'conv-3',
    lead_id: 'lead-3',
    business_name: 'Shree Caterers',
    phone: '919712345678',
    last_message: 'Thank you for your message. We will keep your details in mind.',
    last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    unread_count: 0,
    status: 'active',
    ai_handling: true,
    messages: [
      {
        id: 'm8',
        lead_id: 'lead-3',
        message: 'Hi! Looking to grow your catering business? We help caterers like you get more bookings through digital marketing.',
        direction: 'outbound',
        sent_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
        status: 'read',
      },
      {
        id: 'm9',
        lead_id: 'lead-3',
        message: 'Thank you for your message. We will keep your details in mind.',
        direction: 'inbound',
        sent_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        status: 'read',
      },
    ],
  },
  {
    id: 'conv-4',
    lead_id: 'lead-5',
    business_name: 'Patel Sweet House',
    phone: '919988776655',
    last_message: 'Sounds great! Please send more details to my email.',
    last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    unread_count: 0,
    status: 'closed',
    ai_handling: false,
    messages: [
      {
        id: 'm10',
        lead_id: 'lead-5',
        message: 'Hello! We help sweet shops and food businesses reach more customers through WhatsApp and social media marketing.',
        direction: 'outbound',
        sent_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
        status: 'read',
      },
      {
        id: 'm11',
        lead_id: 'lead-5',
        message: 'Sounds great! Please send more details to my email.',
        direction: 'inbound',
        sent_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        status: 'read',
      },
    ],
  },
]

function MessageStatus({ status }: { status: OutreachMessage['status'] }) {
  if (status === 'sent') return <Check className="w-3 h-3 text-slate-400" />
  if (status === 'delivered') return <CheckCheck className="w-3 h-3 text-slate-400" />
  if (status === 'read') return <CheckCheck className="w-3 h-3 text-blue-400" />
  if (status === 'failed') return <AlertCircle className="w-3 h-3 text-red-400" />
  return null
}

function ConversationItem({
  conversation,
  isSelected,
  onClick,
}: {
  conversation: Conversation
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 ${
        isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
      }`}
    >
      {/* Avatar */}
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-sm shrink-0">
        {conversation.business_name.charAt(0)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-sm text-slate-900 truncate">
            {conversation.business_name}
          </span>
          <span className="text-[11px] text-slate-400 shrink-0">
            {formatRelativeTime(conversation.last_message_at)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-xs text-slate-500 truncate">{conversation.last_message}</p>
          <div className="flex items-center gap-1 shrink-0">
            {conversation.ai_handling && (
              <Bot className="w-3 h-3 text-purple-500" />
            )}
            {conversation.unread_count > 0 && (
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-[10px] font-bold text-white">
                {conversation.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

export default function ConversationsPage() {
  const { toast } = useToast()
  const [conversations, setConversations] = useState<Conversation[]>(generateMockConversations)
  const [selectedId, setSelectedId] = useState<string>(conversations[0]?.id ?? '')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selectedConv = conversations.find((c) => c.id === selectedId)

  const filteredConversations = conversations.filter((c) => {
    const q = search.toLowerCase()
    if (q && !c.business_name.toLowerCase().includes(q) && !c.phone.includes(q)) return false
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    return true
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedId, selectedConv?.messages.length])

  const handleSend = () => {
    if (!newMessage.trim() || !selectedConv) return

    const msg: OutreachMessage = {
      id: `msg-${Date.now()}`,
      lead_id: selectedConv.lead_id,
      message: newMessage.trim(),
      direction: 'outbound',
      sent_at: new Date().toISOString(),
      status: 'sent',
    }

    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedId
          ? {
              ...c,
              messages: [...c.messages, msg],
              last_message: msg.message,
              last_message_at: msg.sent_at,
            }
          : c
      )
    )
    setNewMessage('')

    // Simulate sending via API
    fetch('/api/conversations/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: selectedId, message: msg.message }),
    }).catch(() => {})
  }

  const handleToggleAI = () => {
    if (!selectedConv) return
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedId ? { ...c, ai_handling: !c.ai_handling } : c
      )
    )
    toast({
      title: selectedConv.ai_handling ? 'AI disabled' : 'AI enabled',
      description: selectedConv.ai_handling
        ? 'You are now handling this conversation manually'
        : 'AI will handle responses automatically',
    })
  }

  return (
    <div className="h-[calc(100vh-4rem)] lg:h-screen flex">
      {/* Left Panel: Conversation List */}
      <div className="w-80 shrink-0 flex flex-col border-r border-slate-200 bg-white">
        {/* List Header */}
        <div className="px-4 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900 mb-3">Conversations</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 mt-2 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Conversations</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <MessageCircle className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isSelected={conv.id === selectedId}
                onClick={() => setSelectedId(conv.id)}
              />
            ))
          )}
        </ScrollArea>
      </div>

      {/* Right Panel: Chat Interface */}
      {selectedConv ? (
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-sm">
                {selectedConv.business_name.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{selectedConv.business_name}</h3>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${selectedConv.phone}`}
                    className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    {formatPhone(selectedConv.phone)}
                  </a>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 h-4 ${
                      selectedConv.status === 'active'
                        ? 'text-green-700 border-green-200 bg-green-50'
                        : 'text-slate-500'
                    }`}
                  >
                    {selectedConv.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* AI Toggle */}
              <button
                onClick={handleToggleAI}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedConv.ai_handling
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                {selectedConv.ai_handling ? 'AI On' : 'AI Off'}
              </button>
              {selectedConv.ai_handling && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleAI}
                  className="text-xs h-8"
                >
                  Override AI
                </Button>
              )}
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-4 max-w-2xl mx-auto">
              {selectedConv.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.direction === 'inbound' && (
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-[10px] font-bold shrink-0 mr-2 mt-auto">
                      {selectedConv.business_name.charAt(0)}
                    </div>
                  )}

                  <div
                    className={`max-w-[72%] rounded-2xl px-4 py-2.5 ${
                      msg.direction === 'outbound'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-white text-slate-900 border border-slate-200 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.message}</p>
                    <div
                      className={`flex items-center gap-1 mt-1 ${
                        msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <span
                        className={`text-[10px] ${
                          msg.direction === 'outbound' ? 'text-blue-200' : 'text-slate-400'
                        }`}
                      >
                        {new Date(msg.sent_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {msg.direction === 'outbound' && <MessageStatus status={msg.status} />}
                    </div>
                  </div>

                  {msg.direction === 'outbound' && (
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white shrink-0 ml-2 mt-auto">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {/* AI is typing indicator */}
              {selectedConv.ai_handling && (
                <div className="flex justify-start items-center gap-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 shrink-0">
                    <Bot className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-2 shadow-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                  <span className="text-xs text-purple-500 font-medium">AI responding...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="px-6 py-4 bg-white border-t border-slate-200">
            <div className="max-w-2xl mx-auto">
              {selectedConv.ai_handling && (
                <div className="flex items-center gap-2 mb-2 text-xs text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg">
                  <Bot className="w-3.5 h-3.5" />
                  <span>AI is handling this conversation. Click "Override AI" to take manual control.</span>
                </div>
              )}
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Input
                    placeholder={
                      selectedConv.ai_handling
                        ? 'Override AI to send messages...'
                        : 'Type a message...'
                    }
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        if (!selectedConv.ai_handling) handleSend()
                      }
                    }}
                    disabled={selectedConv.ai_handling}
                    className="h-10"
                  />
                </div>
                <Button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || selectedConv.ai_handling}
                  size="icon"
                  className="h-10 w-10 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Select a conversation</p>
            <p className="text-slate-400 text-sm mt-1">Choose a conversation from the left panel</p>
          </div>
        </div>
      )}
    </div>
  )
}
