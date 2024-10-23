import type { APIRoute } from 'astro'

const API_URL = 'https://background-removal.p.rapidapi.com/remove'
const API_HOST = 'background-removal.p.rapidapi.com'

// Cache implementado como objeto para persistir entre solicitudes
const bgRemovalCache: Record<string, string> = {}

const getApiKeys = () => {
  try {
    return import.meta.env.PUBLIC_API_BG_KEYS?.split(',') || []
  } catch {
    return []
  }
}

async function makeApiRequest (imageUrl: string, apiKey: string): Promise<string | null> {
  const options = {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': API_HOST
    },
    body: new URLSearchParams({
      image_url: imageUrl,
      output_format: 'url',
      to_remove: 'background'
    })
  }

  try {
    const response = await fetch(API_URL, options)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result.response?.image_url || null
  } catch (error) {
    console.error('API request failed:', error)
    return null
  }
}

async function removeBackground (imageUrl: string): Promise<string> {
  console.log('Removing background from', imageUrl)

  // Verificar cache
  if (bgRemovalCache[imageUrl]) {
    return bgRemovalCache[imageUrl]
  }

  const apiKeys = getApiKeys()
  if (!apiKeys.length) return imageUrl

  for (const apiKey of apiKeys) {
    const result = await makeApiRequest(imageUrl, apiKey)
    if (result) {
      // Guardar en cache
      bgRemovalCache[imageUrl] = result
      return result
    }
  }

  console.log('Image', imageUrl, 'could not be processed')
  return imageUrl
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json()
    const { imageUrl } = data

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'Image URL is required' }), {
        status: 400
      })
    }

    const processedUrl = await removeBackground(imageUrl)

    return new Response(JSON.stringify({ processedUrl }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}
