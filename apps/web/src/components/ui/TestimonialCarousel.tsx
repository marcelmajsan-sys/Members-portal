'use client';

import { useState, useCallback, useEffect } from 'react';

interface Testimonial {
  quote: string;
  author: string;
  role?: string;
  company?: string;
}

interface TestimonialCarouselProps {
  testimonials: Testimonial[];
  autoPlay?: boolean;
  interval?: number;
  className?: string;
}

export default function TestimonialCarousel({
  testimonials,
  autoPlay = true,
  interval = 5000,
  className = '',
}: TestimonialCarouselProps) {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % testimonials.length);
  }, [testimonials.length]);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  }, [testimonials.length]);

  useEffect(() => {
    if (!autoPlay || testimonials.length <= 1) return;
    const timer = setInterval(next, interval);
    return () => clearInterval(timer);
  }, [autoPlay, interval, next, testimonials.length]);

  if (testimonials.length === 0) return null;

  const testimonial = testimonials[current];

  return (
    <div className={`relative ${className}`}>
      <div className="bg-white rounded-2xl shadow-sm border border-border-light px-8 py-10 text-center">
        {/* Quote icon */}
        <svg
          className="w-10 h-10 mx-auto mb-6 text-accent"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609L9.978 5.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H0z" />
        </svg>

        <blockquote className="text-lg text-text-body leading-relaxed italic mb-8 max-w-2xl mx-auto">
          &ldquo;{testimonial.quote}&rdquo;
        </blockquote>

        <div className="flex items-center justify-center gap-4">
          {/* Avatar placeholder */}
          <div className="w-12 h-12 rounded-full bg-bg-section flex items-center justify-center">
            <span className="text-text-muted font-semibold text-lg">
              {testimonial.author.charAt(0)}
            </span>
          </div>
          <div className="text-left">
            <p className="font-semibold text-text-heading">{testimonial.author}</p>
            {(testimonial.role || testimonial.company) && (
              <p className="text-sm text-text-secondary mt-0.5">
                {testimonial.role}
                {testimonial.role && testimonial.company && ', '}
                {testimonial.company}
              </p>
            )}
          </div>
        </div>
      </div>

      {testimonials.length > 1 && (
        <>
          {/* Navigation arrows */}
          <button
            onClick={prev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors"
            aria-label="Prethodni"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={next}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors"
            aria-label="Sljedeći"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrent(index)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  index === current ? 'bg-accent' : 'bg-border'
                }`}
                aria-label={`Testimonial ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
