// src/services/backgroundRemoval.ts
const API_KEYS = [
  '0cf4bfaa30mshaeca4e44ff38346p142a67jsn1767286ea3b6',
  'e3f8855306msh0ee2e1b6147aa8bp198acdjsnb67df21362c9',
  '9d0b7fa2f4msh2cf3ec5231e7dabp1acca1jsn29cc3e7607c9',
  'aacce67853msh10ba39580e126ecp1c3be0jsna5c6517eee73'
] as const

interface BackgroundRemovalResponse {
  response?: {
    image_url: string
  }
  error?: string
}

export class BackgroundRemovalService {
  private static instance: BackgroundRemovalService
  private readonly cache: Map<string, string>

  private constructor () {
    this.cache = new Map()
  }

  public static getInstance (): BackgroundRemovalService {
    if (this.instance === null || this.instance === undefined) {
      this.instance = new BackgroundRemovalService()
    }
    return this.instance
  }

  private async makeRequest (imageUrl: string, apiKey: string): Promise<string | null> {
    const url = 'https://background-removal.p.rapidapi.com/remove'
    const options = {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'background-removal.p.rapidapi.com'
      },
      body: new URLSearchParams({
        image_url: imageUrl,
        output_format: 'url',
        to_remove: 'background'
      })
    }

    try {
      const response = await fetch(url, options)
      const result = await response.json() as BackgroundRemovalResponse

      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if ((result.error ?? '') === '' && result.response?.image_url) {
        return result.response.image_url
      }
      return null
    } catch {
      return null
    }
  }

  public async removeBackground (imageUrl: string): Promise<string> {
    if (this.cache.has(imageUrl)) {
      return this.cache.get(imageUrl) as string
    }

    // Try each API key until success
    for (const apiKey of API_KEYS) {
      const result = await this.makeRequest(imageUrl, apiKey)
      if (result != null) {
        // Cache successful result
        this.cache.set(imageUrl, result)
        return result
      }
    }

    // Return original image if all attempts fail
    return imageUrl
  }
}
