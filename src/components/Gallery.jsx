import { useState } from 'react'
import { useLang } from '../context/LanguageContext'
import { galleryPhotos } from '../data/content'

function GalleryCard({ photo }) {
  const { t } = useLang()
  const [failed, setFailed] = useState(false)
  const label = t(photo.label.en, photo.label.hi)

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-card group" style={{ aspectRatio: '1' }}>
      {!failed ? (
        <>
          <img
            src={photo.src}
            alt={label}
            onError={() => setFailed(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent pointer-events-none" />
          <p className="absolute bottom-3 left-3 right-3 text-white text-sm font-semibold leading-snug drop-shadow">
            {label}
          </p>
        </>
      ) : (
        // Placeholder: radial gradient + dish name — replaced automatically once photo file is added
        <div
          className="w-full h-full flex flex-col items-center justify-center p-4 text-center"
          style={{
            background: `radial-gradient(ellipse at 40% 35%, ${photo.bg}cc 0%, ${photo.bg} 70%)`,
          }}
        >
          <div className="w-14 h-14 rounded-full border-2 border-white/30 flex items-center justify-center mb-3">
            {/* Plate + fork icon */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.75">
              <circle cx="11" cy="12" r="8" />
              <path d="M16 2v4a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V2" />
              <line x1="18" y1="8" x2="18" y2="22" />
            </svg>
          </div>
          <p className="text-white font-bold text-sm leading-snug drop-shadow">{label}</p>
          <p className="text-white/60 text-xs mt-1">Photo coming soon</p>
        </div>
      )}
    </div>
  )
}

export default function Gallery() {
  const { t } = useLang()
  return (
    <section className="py-12 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-center text-gray-900 mb-2">
          {t('Fresh From Our Kitchen', 'हमारी रसोई से ताज़ा')}
        </h2>
        <p className="text-center text-gray-500 text-sm mb-8">
          {t('Real food, real photos — no filters.', 'असली खाना, असली फोटो — कोई फ़िल्टर नहीं।')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {galleryPhotos.map((photo, i) => (
            <GalleryCard key={i} photo={photo} />
          ))}
        </div>
      </div>
    </section>
  )
}
