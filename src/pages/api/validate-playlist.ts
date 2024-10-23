import type { APIRoute } from 'astro'

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData()
  const playlistUrl = formData.get('playlistUrl') as string

  // Extraer el ID de la playlist de la URL
  const extractPlaylistId = (url: string): string | null => {
    try {
      // Manejar ambos formatos:
      // https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
      // spotify:playlist:37i9dQZF1DXcBWIGoYBM5M
      const matches = url.match(/playlist[/:]([a-zA-Z0-9]+)/)
      return (matches != null) ? matches[1] : null
    } catch {
      return null
    }
  }

  const playlistId = extractPlaylistId(playlistUrl)

  if (playlistId === null) {
    return redirect('/?error=invalid-url')
  }

  // Redirigir a la página de la playlist
  return redirect(`/playlist/${playlistId}`)
}
