'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { cn } from '@/lib/utils'

const slides = [
  {
    src: '/screenshots/dashboard-main.png',
    alt: 'TokenScope Dashboard - Track tool usage, sessions, and file changes',
    title: 'Dashboard Overview',
    description: 'Track sessions, tool usage, and file changes at a glance',
  },
  {
    src: '/screenshots/dashboard-insights.png',
    alt: 'TokenScope Insights - File types, session lengths, and code churn',
    title: 'Deep Insights',
    description: 'Analyze file types, session patterns, and code churn over time',
  },
  {
    src: '/screenshots/dashboard-plugins.png',
    alt: 'TokenScope Plugins - Track skills, agents, and installed plugins',
    title: 'Plugin Ecosystem',
    description: 'Monitor skills, agents, and your installed plugin environment',
  },
]

export function DashboardCarousel() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true },
    [Autoplay({ delay: 5000, stopOnInteraction: false })]
  )

  const scrollTo = useCallback(
    (index: number) => emblaApi && emblaApi.scrollTo(index),
    [emblaApi]
  )

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect])

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="overflow-hidden rounded-xl" ref={emblaRef}>
        <div className="flex">
          {slides.map((slide, index) => (
            <div key={index} className="flex-[0_0_100%] min-w-0">
              <div className="border border-white/10 bg-white/[0.02] shadow-2xl overflow-hidden rounded-2xl mx-2 backdrop-blur-sm">
                <div className="p-2">
                  <Image
                    src={slide.src}
                    alt={slide.alt}
                    width={1440}
                    height={900}
                    className="rounded-xl w-full h-auto"
                    priority={index === 0}
                  />
                </div>
                <div className="px-4 pb-4 text-center">
                  <p className="text-lg font-medium text-white">{slide.title}</p>
                  <p className="text-sm text-gray-500">{slide.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 mt-4">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={cn(
              "w-2.5 h-2.5 rounded-full transition-all duration-300",
              selectedIndex === index
                ? "bg-emerald-500 w-8"
                : "bg-white/20 hover:bg-white/30"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
