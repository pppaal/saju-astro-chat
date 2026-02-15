import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from '../../middleware'

describe('middleware removed service route blocking', () => {
  it('redirects removed public service routes to home', () => {
    const request = new NextRequest('http://localhost:3000/astrology')
    const response = middleware(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/')
  })

  it('does not redirect API routes', () => {
    const request = new NextRequest('http://localhost:3000/api/astrology', { method: 'GET' })
    const response = middleware(request)

    expect(response.status).not.toBe(307)
  })
})
