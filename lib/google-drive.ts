import { google } from 'googleapis'
import { Readable } from 'stream'
import { generateLeadsExcel } from './excel'
import type { Lead } from './supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DriveUploadResult {
  fileId: string
  webViewLink: string
  downloadLink: string
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing Google OAuth environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN'
    )
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret)
  auth.setCredentials({ refresh_token: refreshToken })
  return auth
}

function getDriveFolderId(): string | undefined {
  return process.env.GOOGLE_DRIVE_FOLDER_ID
}

// ─── Core Upload Function ─────────────────────────────────────────────────────

/**
 * Generate an Excel file from leads and upload it to Google Drive.
 * Makes the file publicly readable and returns shareable links.
 */
export async function uploadLeadsToGoogleDrive(
  leads: Lead[],
  scrapeJob: { industry: string; location: string; created_at: string }
): Promise<DriveUploadResult> {
  const auth = getOAuthClient()
  const drive = google.drive({ version: 'v3', auth })

  // Generate the Excel file
  const { buffer, filename } = await generateLeadsExcel(leads, scrapeJob)

  // Convert buffer to a readable stream
  const stream = Readable.from(buffer)

  // Prepare file metadata
  const fileMetadata: { name: string; parents?: string[] } = {
    name: filename,
  }

  const folderId = getDriveFolderId()
  if (folderId) {
    fileMetadata.parents = [folderId]
  }

  // Upload file
  const uploadResponse = await drive.files.create({
    requestBody: fileMetadata,
    media: {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: stream,
    },
    fields: 'id, webViewLink, webContentLink',
  })

  const fileId = uploadResponse.data.id
  if (!fileId) {
    throw new Error('Google Drive upload succeeded but no file ID was returned')
  }

  // Make file readable by anyone with the link
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  })

  // Fetch the final file details including the shareable link
  const fileDetails = await drive.files.get({
    fileId,
    fields: 'id, webViewLink, webContentLink',
  })

  const webViewLink = fileDetails.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`
  const downloadLink = fileDetails.data.webContentLink || `https://drive.google.com/uc?export=download&id=${fileId}`

  return {
    fileId,
    webViewLink,
    downloadLink,
  }
}

/**
 * Delete a file from Google Drive by its ID.
 */
export async function deleteFileFromGoogleDrive(fileId: string): Promise<void> {
  const auth = getOAuthClient()
  const drive = google.drive({ version: 'v3', auth })

  await drive.files.delete({ fileId })
}

/**
 * List files in the configured Drive folder.
 */
export async function listDriveFiles(pageSize = 20): Promise<
  Array<{ id: string; name: string; webViewLink: string; createdTime: string }>
> {
  const auth = getOAuthClient()
  const drive = google.drive({ version: 'v3', auth })

  const folderId = getDriveFolderId()
  const query = folderId ? `'${folderId}' in parents and trashed = false` : 'trashed = false'

  const response = await drive.files.list({
    q: query,
    pageSize,
    orderBy: 'createdTime desc',
    fields: 'files(id, name, webViewLink, createdTime)',
  })

  return (response.data.files || []).map((f) => ({
    id: f.id || '',
    name: f.name || '',
    webViewLink: f.webViewLink || '',
    createdTime: f.createdTime || '',
  }))
}
