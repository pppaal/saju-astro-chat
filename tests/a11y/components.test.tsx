/**
 * Accessibility Tests for UI Components
 * Tests shadcn/ui components and key application components for WCAG compliance
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { configureAxe, axe } from './axe-helper'
import React from 'react'

// Import shadcn/ui components
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Select, SelectOption } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card-shadcn'

describe('Accessibility: shadcn/ui Components', () => {
  beforeEach(() => {
    cleanup()
  })

  describe('Button', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <div>
          <Button>Click me</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Delete</Button>
          <Button disabled>Disabled</Button>
          <Button isLoading>Loading</Button>
        </div>
      )

      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })

    it('should have accessible loading state', async () => {
      const { container, getByRole } = render(<Button isLoading>Submit</Button>)

      const button = getByRole('button')
      expect(button).toHaveAttribute('aria-busy', 'true')
      expect(button).toBeDisabled()

      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })
  })

  describe('Input', () => {
    it('should have no accessibility violations with label', async () => {
      const { container } = render(
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="Enter email" />
        </div>
      )

      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })

    it('should have accessible error state', async () => {
      const { container } = render(
        <div>
          <Label htmlFor="username">Username</Label>
          <Input id="username" type="text" error aria-describedby="username-error" />
          <span id="username-error" role="alert">
            Username is required
          </span>
        </div>
      )

      const input = container.querySelector('input')
      expect(input).toHaveAttribute('aria-invalid', 'true')

      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })
  })

  describe('Select', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <div>
          <Label htmlFor="country">Country</Label>
          <Select id="country" aria-label="Select country">
            <SelectOption value="">Select a country</SelectOption>
            <SelectOption value="kr">South Korea</SelectOption>
            <SelectOption value="us">United States</SelectOption>
            <SelectOption value="jp">Japan</SelectOption>
          </Select>
        </div>
      )

      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })
  })

  describe('Textarea', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <div>
          <Label htmlFor="bio">Biography</Label>
          <Textarea id="bio" placeholder="Tell us about yourself" rows={4} />
        </div>
      )

      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })
  })

  describe('Badge', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <div>
          <Badge>Default</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="destructive">Error</Badge>
        </div>
      )

      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })
  })

  describe('Alert', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <div>
          <Alert>
            <AlertTitle>Information</AlertTitle>
            <AlertDescription>This is an informational message.</AlertDescription>
          </Alert>

          <Alert variant="success">
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>Operation completed successfully.</AlertDescription>
          </Alert>

          <Alert variant="warning">
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>Please review before continuing.</AlertDescription>
          </Alert>

          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Something went wrong.</AlertDescription>
          </Alert>
        </div>
      )

      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })

    it('should have role="alert"', async () => {
      const { getAllByRole } = render(
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>An error occurred</AlertDescription>
        </Alert>
      )

      const alerts = getAllByRole('alert')
      expect(alerts.length).toBeGreaterThan(0)
    })
  })

  describe('Card', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description goes here</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card content with some text</p>
          </CardContent>
          <CardFooter>
            <Button>Action</Button>
          </CardFooter>
        </Card>
      )

      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })
  })

  describe('Spinner', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <div>
          <Spinner />
          <Spinner label="Loading data" />
          <Spinner size="lg" variant="white" />
        </div>
      )

      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })

    it('should have accessible status role', async () => {
      const { getByRole } = render(<Spinner label="Processing" />)

      const spinner = getByRole('status')
      expect(spinner).toHaveAttribute('aria-label', 'Processing')
    })
  })

  describe('Form with multiple components', () => {
    it('should have no accessibility violations in a complete form', async () => {
      const { container } = render(
        <form aria-label="User registration form">
          <div style={{ marginBottom: '1rem' }}>
            <Label htmlFor="name" required>
              Full Name
            </Label>
            <Input id="name" type="text" required />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <Label htmlFor="email" required>
              Email
            </Label>
            <Input id="email" type="email" required />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <Label htmlFor="gender">Gender</Label>
            <Select id="gender">
              <SelectOption value="">Select gender</SelectOption>
              <SelectOption value="male">Male</SelectOption>
              <SelectOption value="female">Female</SelectOption>
              <SelectOption value="other">Other</SelectOption>
            </Select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" placeholder="Tell us about yourself" />
          </div>

          <Button type="submit">Register</Button>
        </form>
      )

      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })
  })
})
