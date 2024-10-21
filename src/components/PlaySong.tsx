import { useState, useEffect, useRef } from 'react'

interface PlaySongProps {
  previewUrl?: string
}

export default function PlaySong ({ previewUrl }: PlaySongProps): JSX.Element {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const togglePlayPause = (): void => {
    if (audioRef.current == null) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch((error) => console.error(error))
    }
    setIsPlaying(!isPlaying)
  }

  const handleSongEnd = (): void => {
    setIsPlaying(false)
  }

  useEffect(() => {
    const currentAudio = audioRef.current

    if (currentAudio != null) {
      currentAudio.addEventListener('ended', handleSongEnd)
    }

    return () => {
      if (currentAudio != null) {
        currentAudio.removeEventListener('ended', handleSongEnd)
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      if (audioRef.current != null) {
        audioRef.current.pause()
        setIsPlaying(false)
      }
    }
  }, [])

  return (
    <>
      <audio ref={audioRef} src={previewUrl} />
      {isPlaying
        ? (
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='24'
            height='24'
            viewBox='0 0 24 24'
            fill='#D6D6D6'
            className='icon icon-tabler icons-tabler-filled icon-tabler-player-pause'
            onClick={togglePlayPause}
          >
            <path stroke='none' d='M0 0h24v24H0z' fill='none' />
            <path d='M9 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z' />
            <path d='M17 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z' />
          </svg>
          )
        : (
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='24'
            height='24'
            viewBox='0 0 24 24'
            fill='#D6D6D6'
            className='icon icon-tabler icons-tabler-filled icon-tabler-player-play'
            onClick={togglePlayPause}
          >
            <path stroke='none' d='M0 0h24v24H0z' fill='none' />
            <path d='M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z' />
          </svg>
          )}
    </>
  )
}
