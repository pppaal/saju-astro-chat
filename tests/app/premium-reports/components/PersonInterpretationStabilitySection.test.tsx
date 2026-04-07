import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PersonInterpretationStabilitySection from '@/app/premium-reports/_components/PersonInterpretationStabilitySection'

describe('PersonInterpretationStabilitySection', () => {
  it('renders birth-time, conflict, and past reconstruction layers', () => {
    render(
      <PersonInterpretationStabilitySection
        personModel={
          {
            birthTimeHypotheses: [
              {
                label: 'Recorded time',
                birthTime: '06:30',
                bucket: 'morning',
                status: 'current-best',
                fitScore: 0.91,
                confidence: 0.84,
                summary: 'Recorded time keeps the career action axis cleaner.',
                supportSignals: ['Core action axis: career.'],
                cautionSignals: ['Risk axis tilts toward health.'],
                coreDiff: {
                  directAnswer: 'Move only when the role is clearly framed.',
                  actionDomain: 'career',
                  riskDomain: 'health',
                  bestWindow: '1-3m',
                  branchSummary: 'The documented-role path remains strongest.',
                },
              },
            ],
            crossConflictMap: [
              {
                domain: 'career',
                label: 'Career',
                status: 'astro-leading',
                strongestTimescale: '1-3m',
                summary: 'Trigger opens first, structure catches up later.',
                sajuView: 'Structure wants scope clarity first.',
                astroView: 'Timing trigger opens in 1-3m.',
                resolutionMove: 'Write the conditions down before committing.',
              },
            ],
            pastEventReconstruction: {
              summary: 'Past transition windows explain the present tension.',
              markers: [
                {
                  key: 'career-pivot',
                  label: 'Career pivot',
                  ageWindow: '24-29',
                  status: 'conditional',
                  summary: 'A role reset likely hardened the current selection criteria.',
                  evidence: ['scope agreement', 'mobility pressure'],
                },
              ],
            },
          } as any
        }
      />
    )

    expect(screen.getByText('생시 민감도')).toBeInTheDocument()
    expect(screen.getByText(/06:30/)).toBeInTheDocument()
    expect(screen.getByText('Core Diff')).toBeInTheDocument()
    expect(screen.getByText('• Action axis: career')).toBeInTheDocument()
    expect(screen.getByText('교차 충돌 지도')).toBeInTheDocument()
    expect(
      screen.getByText('Resolution Move: Write the conditions down before committing.')
    ).toBeInTheDocument()
    expect(screen.getByText('과거 복원 단서')).toBeInTheDocument()
    expect(screen.getByText('Career pivot')).toBeInTheDocument()
  })
})
