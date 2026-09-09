const GRAPH_ME_URL = 'https://graph.microsoft.com/v1.0/me?$select=jobTitle,department'
const GRAPH_PHOTO_URL = 'https://graph.microsoft.com/v1.0/me/photo/$value'

export async function fetchMicrosoftJobTitle(providerToken: string | null | undefined): Promise<string | null> {
  if (!providerToken) return null

  try {
    const response = await fetch(GRAPH_ME_URL, {
      headers: { Authorization: `Bearer ${providerToken}` },
    })
    if (!response.ok) return null

    const data = await response.json() as { jobTitle?: unknown }
    const title = typeof data.jobTitle === 'string' ? data.jobTitle.trim() : ''
    return title || null
  } catch (error) {
    console.error('Microsoft unvanı alınamadı:', error)
    return null
  }
}

export async function fetchMicrosoftPhotoUrl(providerToken: string | null | undefined): Promise<string | null> {
  if (!providerToken) return null

  try {
    const response = await fetch(GRAPH_PHOTO_URL, {
      headers: { Authorization: `Bearer ${providerToken}` },
    })
    if (!response.ok) return null

    const blob = await response.blob()
    if (!blob || blob.size === 0) return null
    return URL.createObjectURL(blob)
  } catch (error) {
    console.error('Microsoft profil fotoğrafı alınamadı:', error)
    return null
  }
}
