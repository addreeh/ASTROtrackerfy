import React, { useState } from 'react'

const SortableArtists = ({ artists, playlistId }) => {
  const [sortedArtists, setSortedArtists] = useState(artists)
  const [isAscending, setIsAscending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = (event) => {
    const query = event.target.value.toLowerCase()
    setSearchQuery(query)

    const filtered = artists.filter((artist) =>
      artist.name.toLowerCase().includes(query)
    )

    const sorted = filtered.sort((a, b) => {
      return isAscending ? a.percentage - b.percentage : b.percentage - a.percentage
    })

    setSortedArtists(sorted)
  }

  const toggleSortOrder = () => {
    const newOrder = !isAscending
    console.log('new', newOrder)
    setIsAscending(newOrder)

    const sorted = [...sortedArtists].sort((a, b) => {
      return newOrder ? a.percentage - b.percentage : b.percentage - a.percentage
    })

    setSortedArtists(sorted)
  }

  const toggleSearch = () => {
    setIsSearching((prev) => !prev)
    if (isSearching) {
      setSearchQuery('')
      setSortedArtists(artists)
    }
  }

  return (
    <section className='flex h-full flex-col gap-6 overflow-y-auto' id='artists' style={{ scrollbarWidth: 'none' }}>
      <div className='flex items-center justify-between px-[0.375rem]'>
        <div className='flex items-center gap-2'>
          <button onClick={toggleSearch} className='flex items-center text-[#C6C6C6]'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='20'
              height='20'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              className='icon icon-tabler icon-tabler-search'
            >
              <circle cx='10' cy='10' r='7' />
              <line x1='21' y1='21' x2='15' y2='15' />
            </svg>
          </button>
          {isSearching
            ? (
              <input
                type='text'
                value={searchQuery}
                onChange={handleSearch}
                placeholder='Search artists...'
                className='border-b-2 border-[#555] bg-transparent text-white focus:outline-none h-7'
                autoFocus
              />
              )
            : (
              <h1 className='text-xl font-bold text-[#DBDBDB]'>Other Artists</h1>
              )}
        </div>
        <button
          className='text-xs text-[#C6C6C6] flex items-center gap-2 cursor-pointer'
          onClick={toggleSortOrder}
        >
          {!isSearching
            ? isAscending
              ? (
                <>
                  Sort Ascending
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width='16'
                    height='16'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    className='icon icon-tabler icons-tabler-outline icon-tabler-sort-ascending'
                  >
                    <path stroke='none' d='M0 0h24v24H0z' fill='none' />
                    <path d='M4 6l7 0' />
                    <path d='M4 12l7 0' />
                    <path d='M4 18l9 0' />
                    <path d='M15 9l3 -3l3 3' />
                    <path d='M18 6l0 12' />
                  </svg>
                </>
                )
              : (
                <>
                  Sort Descending
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width='16'
                    height='16'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    className='icon icon-tabler icons-tabler-outline icon-tabler-sort-descending'
                  >
                    <path stroke='none' d='M0 0h24v24H0z' fill='none' />
                    <path d='M4 6l9 0' />
                    <path d='M4 12l7 0' />
                    <path d='M4 18l7 0' />
                    <path d='M15 15l3 3l3 -3' />
                    <path d='M18 6l0 12' />
                  </svg>
                </>
                )
            : <></>}
        </button>
      </div>
      <article className='flex flex-col gap-5'>
        {sortedArtists.length > 0
          ? (
              sortedArtists.map((artist, index) => (
                <a
                  href={`/playlist/${playlistId}/artist/${artist.name.toLowerCase()}`}
                  className='block'
                  key={`${artist.name}-${index}`}
                >
                  <div className='flex flex-row items-center justify-between px-2 text-[#E1E1E1] transition-all duration-200 hover:scale-105'>
                    <div className='flex flex-row items-center gap-6'>
                      <div className='relative h-10 w-10 overflow-hidden rounded-full'>
                        <img
                          src={artist.imageUrl || '/avatar.png'}
                          alt={artist.name || 'Unknown Artist'}
                          className='absolute inset-0 h-full w-full object-cover'
                          loading='lazy'
                        />
                      </div>
                      <div className='flex flex-col gap-1'>
                        <p className='text-base font-bold'>{artist.name}</p>
                        <p className='text-sm'>{artist.contentCount} songs</p>
                      </div>
                    </div>
                    <div className='flex flex-row items-center gap-12'>
                      <p className='text-sm text-[#D6D6D6]'>
                        {artist.percentage.toFixed(2)}%
                      </p>
                      <div className='flex h-7 w-7 items-center justify-center rounded-full bg-[#2C2C2C] p-1'>
                        i
                      </div>
                    </div>
                  </div>
                </a>
              ))
            )
          : (
            <p className='text-center text-sm text-[#C6C6C6]'>No artists found.</p>
            )}
      </article>
    </section>
  )
}

export default SortableArtists
