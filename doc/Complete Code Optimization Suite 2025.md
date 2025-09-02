// ===============================
// 🚀 NEXT.JS 15 PERFORMANCE CONFIG
// ===============================

// next.config.js - Ultimate Performance Configuration
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable Turbopack for faster development builds
  turbo: {
    rules: {
      // Optimize asset processing
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // React Compiler (Next.js 15 optimization)
  experimental: {
    reactCompiler: true,
    turbo: {
      rules: {
        '*.svg': ['@svgr/webpack'],
      },
    },
    // Server Components optimization
    serverComponentsExternalPackages: [
      'genkit', 
      '@genkit-ai/core',
      'firebase-admin',
    ],
    // Partial Prerendering for better performance
    ppr: 'incremental',
    // Optimize for concurrent features
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Bundle optimization
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              reuseExistingChunk: true,
            },
            common: {
              name: 'common',
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      }
    }

    // Optimize imports
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, './src'),
      '@/components': require('path').resolve(__dirname, './src/components'),
      '@/lib': require('path').resolve(__dirname, './src/lib'),
      '@/ai': require('path').resolve(__dirname, './src/ai'),
    }

    return config
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Performance headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Security
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          
          // Performance
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { 
            key: 'Strict-Transport-Security', 
            value: 'max-age=31536000; includeSubDomains' 
          },
          
          // Caching
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Static assets caching
      {
        source: '/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },

  // Compression and minification
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  
  // Output optimization
  output: 'standalone',
  swcMinify: true,
  
  // Redirects for SEO
  async redirects() {
    return [
      // Add your redirects here
    ]
  },
}

module.exports = nextConfig

// ===============================
// 🎯 OPTIMIZED COMPONENTS LIBRARY
// ===============================

// src/components/ui/optimized-image.tsx - Smart Image Component
'use client'
import Image from 'next/image'
import { useState, memo } from 'react'
import { cn } from '@/lib/utils'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
}

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 85,
  placeholder = 'blur',
  blurDataURL,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => setError(true)}
        loading={priority ? 'eager' : 'lazy'}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
      
      {isLoading && !error && (
        <div className="absolute inset-0 animate-pulse bg-gray-200" />
      )}
      
      {error && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <span className="text-sm text-gray-500">Failed to load image</span>
        </div>
      )}
    </div>
  )
})

// src/components/performance/lazy-wrapper.tsx - Lazy Loading Wrapper
'use client'
import { lazy, Suspense, ComponentType } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

interface LazyWrapperProps {
  fallback?: React.ReactNode
  error?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>
}

export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyWrapperProps = {}
) {
  const LazyComponent = lazy(importFn)
  
  return function WrappedComponent(props: React.ComponentProps<T>) {
    return (
      <ErrorBoundary
        FallbackComponent={options.error || DefaultErrorFallback}
        onReset={() => window.location.reload()}
      >
        <Suspense fallback={options.fallback || <DefaultLoadingFallback />}>
          <LazyComponent {...props} />
        </Suspense>
      </ErrorBoundary>
    )
  }
}

function DefaultLoadingFallback() {
  return (
    <div className="animate-pulse bg-gray-200 rounded h-32 w-full" />
  )
}

function DefaultErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="p-4 border border-red-200 rounded bg-red-50">
      <h3 className="font-semibold text-red-800">Something went wrong</h3>
      <button 
        onClick={resetErrorBoundary}
        className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  )
}

// ===============================
// ⚡ PERFORMANCE HOOKS & UTILITIES
// ===============================

// src/hooks/use-performance.ts - Performance Monitoring Hook
'use client'
import { useCallback, useEffect, useRef } from 'react'

export function usePerformanceMonitor(componentName: string) {
  const renderStartTime = useRef<number>()
  const mountTime = useRef<number>()

  useEffect(() => {
    mountTime.current = performance.now()
    
    return () => {
      if (mountTime.current) {
        const unmountTime = performance.now()
        const totalTime = unmountTime - mountTime.current
        
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`${componentName} total mount time: ${totalTime.toFixed(2)}ms`)
        }
      }
    }
  }, [componentName])

  const startRender = useCallback(() => {
    renderStartTime.current = performance.now()
  }, [])

  const endRender = useCallback(() => {
    if (renderStartTime.current) {
      const renderTime = performance.now() - renderStartTime.current
      if (process.env.NODE_ENV === 'development' && renderTime > 16) {
        console.warn(`${componentName} slow render: ${renderTime.toFixed(2)}ms`)
      }
    }
  }, [componentName])

  return { startRender, endRender }
}

// src/hooks/use-debounce.ts - Optimized Debounce Hook
import { useEffect, useMemo, useRef } from 'react'

export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const callbackRef = useRef(callback)
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  return useMemo(
    () =>
      ((...args: Parameters<T>) => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        
        timeoutRef.current = setTimeout(() => {
          callbackRef.current(...args)
        }, delay)
      }) as T,
    [delay]
  )
}

// src/hooks/use-intersection-observer.ts - Viewport Detection
import { useEffect, useRef, useState } from 'react'

interface UseIntersectionObserverProps {
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
}

export function useIntersectionObserver({
  threshold = 0,
  rootMargin = '0px',
  triggerOnce = true,
}: UseIntersectionObserverProps = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasTriggered, setHasTriggered] = useState(false)
  const elementRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element || (triggerOnce && hasTriggered)) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isElementIntersecting = entry.isIntersecting
        setIsIntersecting(isElementIntersecting)
        
        if (isElementIntersecting && triggerOnce) {
          setHasTriggered(true)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [threshold, rootMargin, triggerOnce, hasTriggered])

  return { elementRef, isIntersecting }
}

// ===============================
// 🔄 STATE MANAGEMENT OPTIMIZATION
// ===============================

// src/lib/store/performance-store.ts - Optimized Zustand Store
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface PerformanceState {
  // App performance metrics
  loadTime: number
  renderMetrics: Record<string, number>
  errorCount: number
  
  // User interaction tracking
  lastInteraction: number
  isIdle: boolean
  
  // Actions
  setLoadTime: (time: number) => void
  addRenderMetric: (component: string, time: number) => void
  incrementErrorCount: () => void
  updateInteraction: () => void
  setIdle: (idle: boolean) => void
}

export const usePerformanceStore = create<PerformanceState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      loadTime: 0,
      renderMetrics: {},
      errorCount: 0,
      lastInteraction: Date.now(),
      isIdle: false,

      setLoadTime: (time) => set((state) => {
        state.loadTime = time
      }),

      addRenderMetric: (component, time) => set((state) => {
        state.renderMetrics[component] = time
      }),

      incrementErrorCount: () => set((state) => {
        state.errorCount += 1
      }),

      updateInteraction: () => set((state) => {
        state.lastInteraction = Date.now()
        state.isIdle = false
      }),

      setIdle: (idle) => set((state) => {
        state.isIdle = idle
      }),
    }))
  )
)

// Idle detection effect
if (typeof window !== 'undefined') {
  let idleTimer: NodeJS.Timeout

  const resetIdleTimer = () => {
    clearTimeout(idleTimer)
    usePerformanceStore.getState().updateInteraction()
    
    idleTimer = setTimeout(() => {
      usePerformanceStore.getState().setIdle(true)
    }, 30000) // 30 seconds
  }

  ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, resetIdleTimer, true)
  })
}

// ===============================
// 🤖 GENKIT AI OPTIMIZATIONS
// ===============================

// src/ai/optimized-flows.ts - Production-Ready AI Flows
import { defineFlow, runFlow } from 'genkit'
import { gemini15Pro, gemini15Flash } from '@genkit-ai/googleai'
import { z } from 'zod'

// Cached prompt templates for better performance
const PROMPT_CACHE = new Map<string, string>()

// Optimized AI flow with caching and error handling
export const optimizedHarmonizationFlow = defineFlow(
  {
    name: 'optimizedMultiCapitalHarmonization',
    inputSchema: z.object({
      capitals: z.array(z.object({
        type: z.enum(['financial', 'human', 'social', 'natural', 'manufactured', 'intellectual']),
        value: z.number(),
        metrics: z.record(z.any()),
        constraints: z.array(z.string()).optional(),
      })),
      objectives: z.array(z.string()),
      timeHorizon: z.number(),
      riskTolerance: z.enum(['low', 'medium', 'high']),
      useCache: z.boolean().default(true),
    }),
    outputSchema: z.object({
      optimizedAllocation: z.record(z.number()),
      tradeoffs: z.array(z.object({
        description: z.string(),
        impact: z.number(),
        mitigation: z.string(),
      })),
      recommendations: z.array(z.string()),
      confidence: z.number(),
      reasoning: z.string(),
      processingTime: z.number(),
    }),
  },
  async (input) => {
    const startTime = performance.now()
    
    // Generate cache key
    const cacheKey = JSON.stringify({
      capitals: input.capitals,
      objectives: input.objectives,
      timeHorizon: input.timeHorizon,
      riskTolerance: input.riskTolerance,
    })
    
    // Check cache first
    if (input.useCache && PROMPT_CACHE.has(cacheKey)) {
      const cachedResult = JSON.parse(PROMPT_CACHE.get(cacheKey)!)
      return {
        ...cachedResult,
        processingTime: performance.now() - startTime,
      }
    }

    try {
      // Use Gemini Flash for faster responses when possible
      const model = input.capitals.length > 5 ? gemini15Pro : gemini15Flash
      
      const prompt = `
      SYSTEM: You are an expert multi-capital optimization AI. Respond ONLY with valid JSON.
      
      TASK: Optimize capital allocation for maximum sustainable value creation.
      
      INPUTS:
      Capitals: ${JSON.stringify(input.capitals)}
      Objectives: ${input.objectives.join(', ')}
      Time Horizon: ${input.timeHorizon} years
      Risk Tolerance: ${input.riskTolerance}
      
      OUTPUT FORMAT (JSON only):
      {
        "optimizedAllocation": {"financial": 0.3, "human": 0.2, ...},
        "tradeoffs": [{"description": "...", "impact": 0.7, "mitigation": "..."}],
        "recommendations": ["...", "..."],
        "confidence": 0.85,
        "reasoning": "..."
      }
      `

      const result = await runFlow(model, {
        prompt: prompt.trim(),
        config: {
          temperature: 0.2, // Lower temperature for consistent results
          maxOutputTokens: 2048,
          topK: 40,
          topP: 0.8,
        },
      })

      // Parse and validate response
      const parsed = JSON.parse(result.text)
      const processingTime = performance.now() - startTime
      
      const finalResult = {
        ...parsed,
        processingTime,
      }

      // Cache successful results
      if (input.useCache) {
        PROMPT_CACHE.set(cacheKey, JSON.stringify(parsed))
      }

      return finalResult

    } catch (error) {
      console.error('AI Flow Error:', error)
      
      // Fallback response
      return {
        optimizedAllocation: input.capitals.reduce((acc, c) => {
          acc[c.type] = 1 / input.capitals.length
          return acc
        }, {} as Record<string, number>),
        tradeoffs: [{
          description: "Analysis requires manual review due to processing error",
          impact: 0.5,
          mitigation: "Consult with domain experts"
        }],
        recommendations: ["Review inputs for accuracy", "Try again with simpler parameters"],
        confidence: 0.3,
        reasoning: "Automated analysis failed, manual review recommended",
        processingTime: performance.now() - startTime,
      }
    }
  }
)

// Batch processing for multiple analyses
export const batchHarmonizationFlow = defineFlow(
  {
    name: 'batchMultiCapitalAnalysis',
    inputSchema: z.object({
      scenarios: z.array(z.any()).max(5), // Limit batch size
      parallel: z.boolean().default(true),
    }),
    outputSchema: z.object({
      results: z.array(z.any()),
      totalProcessingTime: z.number(),
      successRate: z.number(),
    }),
  },
  async (input) => {
    const startTime = performance.now()
    const results: any[] = []
    let successCount = 0

    if (input.parallel) {
      // Process scenarios in parallel
      const promises = input.scenarios.map(scenario =>
        optimizedHarmonizationFlow(scenario).catch(error => ({ error }))
      )
      
      const batchResults = await Promise.all(promises)
      
      batchResults.forEach(result => {
        if (!result.error) {
          successCount++
        }
        results.push(result)
      })
    } else {
      // Process scenarios sequentially for memory efficiency
      for (const scenario of input.scenarios) {
        try {
          const result = await optimizedHarmonizationFlow(scenario)
          results.push(result)
          successCount++
        } catch (error) {
          results.push({ error })
        }
      }
    }

    return {
      results,
      totalProcessingTime: performance.now() - startTime,
      successRate: successCount / input.scenarios.length,
    }
  }
)