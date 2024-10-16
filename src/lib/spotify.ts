import type { ArtistInfo, ContentInfo, PlaylistInfo } from '@/env'
import SpotifyWebApi from 'spotify-web-api-node'

const spotifyApi = new SpotifyWebApi({
  clientId: import.meta.env.SPOTIFY_CLIENT_ID,
  clientSecret: import.meta.env.SPOTIFY_CLIENT_SECRET
})

async function getAllPlaylistItems (
  playlistId: string
): Promise<SpotifyApi.PlaylistTrackObject[]> {
  let items: SpotifyApi.PlaylistTrackObject[] = []
  let offset = 0
  const limit = 100
  let total = 1 // Initialize to 1 to enter the loop

  while (offset < total) {
    const response = await spotifyApi.getPlaylistTracks(playlistId, {
      offset,
      limit
    })
    items = items.concat(response.body.items)
    total = response.body.total
    offset += limit
  }

  return items
}

async function getArtistImagesAndFollowers (
  artistIds: string[]
): Promise<Map<string, { imageUrl: string, followers: number }>> {
  const artistInfoMap = new Map<string, { imageUrl: string, followers: number }>()
  const chunkSize = 50 // Spotify permite hasta 50 IDs por solicitud

  for (let i = 0; i < artistIds.length; i += chunkSize) {
    const chunk = artistIds.slice(i, i + chunkSize)
    try {
      const response = await spotifyApi.getArtists(chunk)
      response.body.artists.forEach(artist => {
        artistInfoMap.set(artist.id, {
          imageUrl: artist.images != null && artist.images.length > 0 ? artist.images[0].url : '',
          followers: artist.followers.total
        })
      })
    } catch (error: any) {
      try {
        if (error.statusCode === 429) {
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          const retryAfter = parseInt(error.headers['retry-after'] || '1', 10)
          console.log(`Rate limited. Retrying after ${retryAfter} seconds.`)
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
          i -= chunkSize
        }
      } catch (error) {
        const artist = artistIds[i]
        artistInfoMap.set(artist, {
          imageUrl: '',
          followers: 0
        })
      }

      if (i + chunkSize < artistIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }

  return artistInfoMap
}

export async function getPlaylistInfo (
  playlistId: string
): Promise<PlaylistInfo> {
  // Authenticate with Spotify
  const data = await spotifyApi.clientCredentialsGrant()
  spotifyApi.setAccessToken(data.body.access_token)

  // Fetch playlist data
  const playlist = await spotifyApi.getPlaylist(playlistId)
  const items = await getAllPlaylistItems(playlistId)

  // Process items and calculate percentages
  const artistMap = new Map<string, ArtistInfo>()
  const totalItems = items.length
  const contentBreakdown = { tracks: 0, episodes: 0, other: 0 }

  items.forEach(item => {
    if (item.track != null) {
      let contentType: 'track' | 'episode' | 'other'
      let contentName: string
      let contentArtists: Array<{ name: string, id: string }> = []

      if (item.track.type === 'track') {
        contentType = 'track'
        contentName = item.track.name
        contentArtists = item.track.artists.map(artist => ({
          name: artist.name,
          id: artist.id
        }))
        contentBreakdown.tracks++
      } else if (item.track.type === 'episode') {
        contentType = 'episode'
        contentName = item.track.name
        contentArtists = item.track.artists.map(artist => ({
          name: artist.name,
          id: artist.id
        }))
        contentBreakdown.episodes++
      } else {
        contentType = 'other'
        contentName = item.track.name ?? 'Unknown Content'
        contentBreakdown.other++
      }

      const contentInfo: ContentInfo = {
        name: contentName,
        type: contentType,
        artists: contentArtists.map(artist => artist.name),
        imageUrl: item.track.album?.images?.[0]?.url ?? '',
        percentage: (1 / totalItems) * 100
      }

      contentArtists.forEach(artist => {
        if (!artistMap.has(artist.id)) {
          artistMap.set(artist.id, {
            name: artist.name,
            id: artist.id,
            contentCount: 0,
            percentage: 0,
            content: []
          })
        }
        const artistInfo = artistMap.get(artist.id)
        if (artistInfo != null) {
          artistInfo.contentCount++
          artistInfo.content.push(contentInfo)
        }
      })
    }
  })

  // Fetch artist images
  const artistIds = Array.from(artistMap.keys())
  const artistInfoMap = await getArtistImagesAndFollowers(artistIds)

  // Update artist info with images and followers
  artistMap.forEach((artist, id) => {
    const info = artistInfoMap.get(id)
    if (info != null) {
      artist.imageUrl = info.imageUrl
      artist.followers = info.followers
    }
  })

  const artistArray = Array.from(artistMap.values())

  // Calculate percentages and sort
  artistArray.forEach(artist => {
    artist.percentage = (artist.contentCount / totalItems) * 100
  })
  artistArray.sort((a, b) => b.percentage - a.percentage)

  // Extract relevant information
  const playlistInfo: PlaylistInfo = {
    name: playlist.body.name,
    description: playlist.body.description ?? '',
    followers: playlist.body.followers.total,
    totalItems,
    artists: artistArray.map(artist => ({
      ...artist,
      followers: artist.followers ?? 0
    })),
    image: playlist.body.images[0].url ?? '',
    owner: {
      name: playlist.body.owner.display_name ?? '',
      url: playlist.body.owner.external_urls.spotify ?? ''
    },
    contentBreakdown
  }

  return playlistInfo
}
