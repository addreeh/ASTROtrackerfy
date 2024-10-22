import type { ArtistInfo, ContentInfo, PlaylistInfo } from '@/env'
import SpotifyWebApi from 'spotify-web-api-node'

const createSpotifyApi = (): SpotifyWebApi => new SpotifyWebApi({
  clientId: import.meta.env.SPOTIFY_CLIENT_ID,
  clientSecret: import.meta.env.SPOTIFY_CLIENT_SECRET
})

let tokenCache: { token: string, expires: number } | null = null

async function getValidToken (spotifyApi: SpotifyWebApi): Promise<string> {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { body: { access_token } } = await spotifyApi.clientCredentialsGrant()
    return access_token
  }

  const now = Date.now()
  if ((tokenCache != null) && now < tokenCache.expires) {
    return tokenCache.token
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { body: { access_token, expires_in } } = await spotifyApi.clientCredentialsGrant()
  tokenCache = {
    token: access_token,
    expires: now + (expires_in * 1000) - 60000
  }
  return access_token
}

async function getAllPlaylistItems (
  spotifyApi: SpotifyWebApi,
  playlistId: string
): Promise<SpotifyApi.PlaylistTrackObject[]> {
  const limit = 100
  const firstBatch = await spotifyApi.getPlaylistTracks(playlistId, { limit })
  const total = firstBatch.body.total
  const numberOfCalls = Math.ceil((total - limit) / limit)

  if (numberOfCalls <= 0) return firstBatch.body.items

  const promises = Array.from({ length: numberOfCalls }, async (_, i) =>
    await spotifyApi.getPlaylistTracks(playlistId, {
      offset: (i + 1) * limit,
      limit
    })
  )

  const results = await Promise.allSettled(promises)
  const successfulResults = results
    .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
    .map(result => result.value.body.items)

  return [
    ...firstBatch.body.items,
    ...successfulResults.flat()
  ]
}

async function getArtistImagesAndFollowers (
  spotifyApi: SpotifyWebApi,
  artistIds: string[]
): Promise<Map<string, { imageUrl: string, followers: number }>> {
  const artistInfoMap = new Map<string, { imageUrl: string, followers: number }>()
  const chunkSize = 50

  const validIds = artistIds.filter(id => /^[a-zA-Z0-9]{22}$/.test(id))
  const invalidIds = artistIds.filter(id => !validIds.includes(id))

  invalidIds.forEach(id => {
    artistInfoMap.set(id, { imageUrl: '', followers: 0 })
  })

  const chunks = Array.from(
    { length: Math.ceil(validIds.length / chunkSize) },
    (_, i) => validIds.slice(i * chunkSize, (i + 1) * chunkSize)
  )

  const processChunk = async (chunk: string[]): Promise<void> => {
    try {
      const response = await spotifyApi.getArtists(chunk)
      response.body.artists.forEach(artist => {
        if (artist.id != null) {
          artistInfoMap.set(artist.id, {
            imageUrl: artist.images?.[0]?.url ?? '',
            followers: artist.followers?.total ?? 0
          })
        }
      })
    } catch (error: any) {
      if (error.statusCode === 429) {
        const retryAfter = parseInt(error.headers['retry-after'] ?? '1', 10) * 1000
        await new Promise(resolve => setTimeout(resolve, retryAfter))
        await processChunk(chunk)
      } else {
        await Promise.allSettled(
          chunk.map(async (artistId) => {
            try {
              const response = await spotifyApi.getArtists([artistId])
              const artist = response.body.artists[0]
              if (artist.id != null) {
                artistInfoMap.set(artist.id, {
                  imageUrl: artist.images?.[0]?.url ?? '',
                  followers: artist.followers?.total ?? 0
                })
              }
            } catch {
              artistInfoMap.set(artistId, { imageUrl: '', followers: 0 })
            }
          })
        )
      }
    }
  }

  const concurrencyLimit = import.meta.env.DEV ? 1 : 3
  for (let i = 0; i < chunks.length; i += concurrencyLimit) {
    const currentChunks = chunks.slice(i, i + concurrencyLimit)
    await Promise.all(currentChunks.map(processChunk))
  }

  return artistInfoMap
}

export async function getPlaylistInfo (playlistId: string): Promise<PlaylistInfo> {
  const spotifyApi = createSpotifyApi()
  const token = await getValidToken(spotifyApi)
  spotifyApi.setAccessToken(token)

  const [playlist, items] = await Promise.all([
    spotifyApi.getPlaylist(playlistId),
    getAllPlaylistItems(spotifyApi, playlistId)
  ])

  const artistMap = new Map<string, ArtistInfo>()
  const contentBreakdown = { tracks: 0, episodes: 0, other: 0 }
  const totalItems = items.length

  for (const item of items) {
    if ((item?.track) == null) continue

    const track = item.track
    const contentType = track.type === 'track'
      ? 'track'
      : track.type === 'episode'
        ? 'episode'
        : 'other'

    contentBreakdown[contentType as keyof typeof contentBreakdown]++

    const contentInfo: ContentInfo = {
      name: track.name ?? 'Unknown Content',
      type: contentType,
      artists: track.artists?.map(artist => artist.name) ?? [],
      imageUrl: track.album?.images?.[0]?.url ?? '',
      previewUrl: track.preview_url ?? '',
      percentage: (1 / totalItems) * 100
    }

    for (const artist of (track.artists ?? [])) {
      if (artist.id === null) continue

      const existingArtist = artistMap.get(artist.id) ?? {
        name: artist.name ?? 'Unknown Artist',
        id: artist.id,
        contentCount: 0,
        percentage: 0,
        content: []
      }

      existingArtist.contentCount++
      existingArtist.content.push(contentInfo)
      artistMap.set(artist.id, existingArtist)
    }
  }

  const artistInfoMap = await getArtistImagesAndFollowers(
    spotifyApi,
    Array.from(artistMap.keys())
  )

  const artists = Array.from(artistMap.values())
    .map(artist => ({
      ...artist,
      percentage: (artist.contentCount / totalItems) * 100,
      imageUrl: artistInfoMap.get(artist.id)?.imageUrl ?? '',
      followers: artistInfoMap.get(artist.id)?.followers ?? 0
    }))
    .sort((a, b) => b.percentage - a.percentage)

  return {
    name: playlist.body.name,
    description: playlist.body.description ?? '',
    followers: playlist.body.followers.total,
    totalItems,
    artists,
    image: playlist.body.images[0]?.url ?? '',
    owner: {
      name: playlist.body.owner.display_name ?? '',
      url: playlist.body.owner.external_urls.spotify ?? ''
    },
    contentBreakdown
  }
}
