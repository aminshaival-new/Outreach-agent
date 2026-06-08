import ExcelJS from 'exceljs'
import type { Lead } from './supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExcelGenerationResult {
  buffer: Buffer
  filename: string
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1A1A2E' }, // dark navy
}

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 11,
  name: 'Calibri',
}

const ACCENT_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE8F5E9' }, // light green for alternating rows
}

const STAGE_COLORS: Record<string, string> = {
  new:            'FFE3F2FD', // light blue
  contacted:      'FFFFF8E1', // light yellow
  replied:        'FFE8EAF6', // light indigo
  interested:     'FFE8F5E9', // light green
  call_booked:    'FFF3E5F5', // light purple
  closed_won:     'FF43A047', // solid green
  closed_lost:    'FFEF5350', // solid red
  not_interested: 'FFF5F5F5', // light gray
}

const STAGE_FONT_COLORS: Record<string, string> = {
  closed_won:  'FFFFFFFF',
  closed_lost: 'FFFFFFFF',
}

// ─── Column Definitions ───────────────────────────────────────────────────────

const COLUMNS: Array<{
  header: string
  key: string
  width: number
  wrapText?: boolean
}> = [
  { header: '#',              key: 'row_num',         width: 5 },
  { header: 'Business Name',  key: 'business_name',   width: 30 },
  { header: 'Phone',          key: 'phone',           width: 18 },
  { header: 'Email',          key: 'email',           width: 28 },
  { header: 'Website',        key: 'website',         width: 35 },
  { header: 'Category',       key: 'category',        width: 20 },
  { header: 'Rating',         key: 'google_rating',   width: 8 },
  { header: 'Reviews',        key: 'review_count',    width: 10 },
  { header: 'Address',        key: 'address',         width: 35, wrapText: true },
  { header: 'City',           key: 'city',            width: 16 },
  { header: 'Facebook',       key: 'facebook_url',    width: 35 },
  { header: 'Instagram',      key: 'instagram_url',   width: 35 },
  { header: 'LinkedIn',       key: 'linkedin_url',    width: 35 },
  { header: 'Pipeline Stage', key: 'pipeline_stage',  width: 18 },
  { header: 'Lead Score',     key: 'lead_score',      width: 12 },
  { header: 'Maps URL',       key: 'google_maps_url', width: 40 },
]

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Generate a professional Excel workbook from a list of leads.
 * Returns the file as a Buffer along with a suggested filename.
 */
export async function generateLeadsExcel(
  leads: Lead[],
  scrapeJob: { industry: string; location: string; created_at: string }
): Promise<ExcelGenerationResult> {
  const workbook = new ExcelJS.Workbook()

  workbook.creator = 'Local Lead AI'
  workbook.created = new Date()
  workbook.modified = new Date()

  // ── Main Leads Sheet ─────────────────────────────────────────────────────

  const worksheet = workbook.addWorksheet('Leads', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
    },
  })

  // Set columns
  worksheet.columns = COLUMNS.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width,
    style: {
      alignment: {
        vertical: 'middle' as const,
        wrapText: col.wrapText ?? false,
      },
    },
  }))

  // Style header row
  const headerRow = worksheet.getRow(1)
  headerRow.height = 28
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false }
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF0D47A1' } },
    }
  })

  // Add data rows
  leads.forEach((lead, index) => {
    const isEven = index % 2 === 0
    const stageColor = STAGE_COLORS[lead.pipeline_stage] || 'FFFFFFFF'
    const stageFontColor = STAGE_FONT_COLORS[lead.pipeline_stage]

    const row = worksheet.addRow({
      row_num:        index + 1,
      business_name:  lead.business_name,
      phone:          lead.phone || '',
      email:          lead.email || '',
      website:        lead.website || '',
      category:       lead.category || '',
      google_rating:  lead.google_rating ?? '',
      review_count:   lead.review_count,
      address:        lead.address || '',
      city:           lead.city || '',
      facebook_url:   lead.facebook_url || '',
      instagram_url:  lead.instagram_url || '',
      linkedin_url:   lead.linkedin_url || '',
      pipeline_stage: lead.pipeline_stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      lead_score:     lead.lead_score,
      google_maps_url: lead.google_maps_url || '',
    })

    row.height = 20

    // Base row fill (alternating)
    const baseFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8F9FA' },
    }

    // Apply fills and borders to each cell
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.fill = baseFill
      cell.font = { size: 10, name: 'Calibri' }
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      }
      cell.alignment = { vertical: 'middle', wrapText: false }

      // Hyperlinks for URLs
      const col = COLUMNS[colNumber - 1]
      if (col && ['website', 'facebook_url', 'instagram_url', 'linkedin_url', 'google_maps_url'].includes(col.key)) {
        const val = cell.value as string
        if (val && val.startsWith('http')) {
          cell.value = { text: val, hyperlink: val }
          cell.font = { size: 10, name: 'Calibri', color: { argb: 'FF1565C0' }, underline: true }
        }
      }

      // Pipeline stage cell: colored
      if (col?.key === 'pipeline_stage') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: stageColor } }
        cell.font = {
          size: 10,
          name: 'Calibri',
          bold: true,
          color: { argb: stageFontColor || 'FF000000' },
        }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      }

      // Lead score: color based on value
      if (col?.key === 'lead_score') {
        const score = cell.value as number
        let scoreColor = 'FFEF5350' // red < 40
        if (score >= 70) scoreColor = 'FF43A047' // green
        else if (score >= 40) scoreColor = 'FFFB8C00' // orange
        cell.font = { size: 10, name: 'Calibri', bold: true, color: { argb: scoreColor } }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      }

      // Rating: bold
      if (col?.key === 'google_rating' && cell.value) {
        cell.font = { size: 10, name: 'Calibri', bold: true }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      }
    })

  })

  // Auto-filter on all columns
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: COLUMNS.length },
  }

  // ── Summary Sheet ────────────────────────────────────────────────────────

  const summarySheet = workbook.addWorksheet('Summary')
  summarySheet.columns = [
    { key: 'metric', width: 30 },
    { key: 'value', width: 20 },
  ]

  const stageCounts = leads.reduce<Record<string, number>>((acc, lead) => {
    acc[lead.pipeline_stage] = (acc[lead.pipeline_stage] || 0) + 1
    return acc
  }, {})

  const totalWithPhone = leads.filter((l) => l.phone).length
  const totalWithWebsite = leads.filter((l) => l.has_website).length
  const avgRating =
    leads.filter((l) => l.google_rating).reduce((sum, l) => sum + (l.google_rating || 0), 0) /
    (leads.filter((l) => l.google_rating).length || 1)

  const summaryTitle = summarySheet.addRow(['Local Lead AI — Scrape Summary'])
  summaryTitle.font = { bold: true, size: 14, name: 'Calibri' }
  summaryTitle.height = 30

  summarySheet.addRow([])

  const metaRows = [
    ['Industry', scrapeJob.industry],
    ['Location', scrapeJob.location],
    ['Scraped At', new Date(scrapeJob.created_at).toLocaleString('en-IN')],
    ['Total Leads', leads.length],
    ['Leads with Phone', totalWithPhone],
    ['Leads with Website', totalWithWebsite],
    ['Leads without Website', leads.length - totalWithWebsite],
    ['Average Google Rating', avgRating.toFixed(1)],
  ]

  for (const [metric, value] of metaRows) {
    const row = summarySheet.addRow([metric, value])
    row.getCell(1).font = { bold: true, name: 'Calibri', size: 10 }
    row.getCell(2).font = { name: 'Calibri', size: 10 }
  }

  summarySheet.addRow([])
  const stageTitle = summarySheet.addRow(['Pipeline Stage Breakdown', ''])
  stageTitle.font = { bold: true, size: 12, name: 'Calibri' }

  for (const [stage, count] of Object.entries(stageCounts)) {
    const label = stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    const row = summarySheet.addRow([label, count])
    row.getCell(1).font = { name: 'Calibri', size: 10 }
    row.getCell(2).font = { bold: true, name: 'Calibri', size: 10 }
  }

  // ── Generate filename and buffer ─────────────────────────────────────────

  const dateStr = new Date(scrapeJob.created_at).toISOString().slice(0, 10)
  const safeName = `${scrapeJob.industry}_${scrapeJob.location}`.replace(/[^a-zA-Z0-9_-]/g, '_')
  const filename = `LocalLeadAI_${safeName}_${dateStr}.xlsx`

  const buffer = await workbook.xlsx.writeBuffer()

  return {
    buffer: Buffer.from(buffer),
    filename,
  }
}
