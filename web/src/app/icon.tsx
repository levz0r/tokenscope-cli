import { ImageResponse } from 'next/og'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default async function Icon() {
  const geistBold = await fetch(
    new URL('https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@5.0.3/files/geist-sans-latin-700-normal.woff')
  ).then((res) => res.arrayBuffer())

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 14,
          background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: 'Geist',
          fontWeight: 700,
          borderRadius: 6,
          letterSpacing: '-0.02em',
        }}
      >
        TS
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Geist',
          data: geistBold,
          style: 'normal',
          weight: 700,
        },
      ],
    }
  )
}
