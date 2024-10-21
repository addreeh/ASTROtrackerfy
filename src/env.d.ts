/// <reference path="../.astro/types.d.ts" />

export interface ContentInfo {
  name: string
  type: 'track' | 'episode' | 'other'
  artists?: string[]
  imageUrl: string
  previewUrl?: string
  percentage: number
}

export interface ArtistInfo {
  name: string
  id: string
  contentCount: number
  percentage: number
  content: ContentInfo[]
  imageUrl?: string
  followers?: number
}

export interface PlaylistInfo {
  name: string
  description: string
  followers: number
  totalItems: number
  image: string
  owner: {
    name: string
    url: string
  }
  artists: ArtistInfo[]
  contentBreakdown: {
    tracks: number
    episodes: number
    other: number
  }
}

export interface SongInfo {
  name: string
  type: string
  artists: string[]
  percentage: number
}
