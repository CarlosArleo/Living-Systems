// src/ai/config.ts - Production Genkit Configuration
import { configureGenkit } from 'genkit'
import { firebase } from '@genkit-ai/firebase'
import { googleAI } from '@genkit-ai/googleai'
import { dotprompt } from '@genkit-ai/dotprompt'

export const ai = configureGenkit({
  plugins: [
    // Firebase integration for production deployment
    firebase(),
    
    // Google AI for Gemini models
    googleAI({
      apiKey: process.env.GOOGLE_AI_API_KEY,
    }),
    
    // Dotprompt for prompt management
    dotprompt(),
  ],
  
  // Production logging configuration
  logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  
  // Enable tracing for production monitoring
  enableTracingAndMetrics: true,
  
  // Flow server configuration
  flowStateStore: 'firebase',
})

// src/ai/flows/harmonization.ts - Multi-capital harmonization flow
import { defineFlow, runFlow } from 'genkit'
import { gemini15Pro } from '@genkit-ai/googleai'
import { z } from 'zod'

// Input schema for multi-capital harmonization
const HarmonizationInput = z.object({
  capitals: z.array(z.object({
    type: z.enum(['financial', 'human', 'social', 'natural', 'manufactured', 'intellectual']),
    value: z.number(),
    metrics: z.record(z.any()),
    constraints: z.array(z.string()).optional(),
  })),
  objectives: z.array(z.string()),
  timeHorizon: z.number(),
  riskTolerance: z.enum(['low', 'medium', 'high']),
})

// Output schema
const HarmonizationOutput = z.object({
  optimizedAllocation: z.record(z.number()),
  tradeoffs: z.array(z.object({
    description: z.string(),
    impact: z.number(),
    mitigation: z.string(),
  })),
  recommendations: z.array(z.string()),
  confidence: z.number(),
  reasoning: z.string(),
})

export const multiCapitalHarmonizationFlow = defineFlow(
  {
    name: 'multiCapitalHarmonization',
    inputSchema: HarmonizationInput,
    outputSchema: HarmonizationOutput,
  },
  async (input) => {
    // Enhanced prompt for multi-capital optimization
    const prompt = `
    You are an expert in multi-capital optimization and sustainable value creation.
    
    Analyze the following capital allocation scenario:
    
    Available Capitals:
    ${input.capitals.map(c => `- ${c.type}: ${c.value} (${JSON.stringify(c.metrics)})`).join('\n')}
    
    Objectives:
    ${input.objectives.map(o => `- ${o}`).join('\n')}
    
    Constraints:
    - Time horizon: ${input.timeHorizon} years
    - Risk tolerance: ${input.riskTolerance}
    
    Provide an optimized allocation strategy that:
    1. Maximizes synergies between different capital types
    2. Balances short-term and long-term value creation
    3. Considers sustainability and stakeholder impact
    4. Identifies key trade-offs and mitigation strategies
    
    Format your response as a detailed JSON analysis.
    `

    const result = await runFlow(gemini15Pro, {
      prompt,
      config: {
        temperature: 0.3, // Lower temperature for consistent optimization
        maxOutputTokens: 2048,
      },
    })

    // Parse and validate the AI response
    try {
      const parsed = JSON.parse(result.text)
      return HarmonizationOutput.parse(parsed)
    } catch (error) {
      // Fallback structured response if JSON parsing fails
      return {
        optimizedAllocation: input.capitals.reduce((acc, c) => {
          acc[c.type] = c.value / input.capitals.length
          return acc
        }, {} as Record<string, number>),
        tradeoffs: [{
          description: "Analysis requires manual review",
          impact: 0.5,
          mitigation: "Consult with domain experts"
        }],
        recommendations: ["Review AI response manually", "Validate allocation strategy"],
        confidence: 0.6,
        reasoning: result.text
      }
    }
  }
)

// src/ai/flows/monitoring.ts - Production monitoring flow
export const monitoringFlow = defineFlow(
  {
    name: 'systemMonitoring',
    inputSchema: z.object({
      metrics: z.record(z.any()),
      thresholds: z.record(z.number()),
    }),
    outputSchema: z.object({
      alerts: z.array(z.string()),
      status: z.enum(['healthy', 'warning', 'critical']),
      recommendations: z.array(z.string()),
    }),
  },
  async (input) => {
    const alerts: string[] = []
    let status: 'healthy' | 'warning' | 'critical' = 'healthy'
    
    // Check system health metrics
    Object.entries(input.thresholds).forEach(([metric, threshold]) => {
      const value = input.metrics[metric]
      if (value > threshold) {
        alerts.push(`${metric} exceeded threshold: ${value} > ${threshold}`)
        status = status === 'healthy' ? 'warning' : 'critical'
      }
    })
    
    return {
      alerts,
      status,
      recommendations: alerts.length > 0 
        ? ['Review system performance', 'Consider scaling resources']
        : ['System operating normally']
    }
  }
)