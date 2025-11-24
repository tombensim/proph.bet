/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/ui/badge'

describe('Badge Component', () => {
  it('should render a badge with text', () => {
    render(<Badge>New</Badge>)
    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it('should render with default variant classes', () => {
    const { container } = render(<Badge>Default</Badge>)
    const badge = container.firstChild as HTMLElement
    
    expect(badge).toHaveClass('bg-primary')
    expect(badge).toHaveClass('text-primary-foreground')
  })

  it('should render with secondary variant classes', () => {
    const { container } = render(<Badge variant="secondary">Secondary</Badge>)
    const badge = container.firstChild as HTMLElement
    
    expect(badge).toHaveClass('bg-secondary')
  })

  it('should render with destructive variant classes', () => {
    const { container } = render(<Badge variant="destructive">Error</Badge>)
    const badge = container.firstChild as HTMLElement
    
    expect(badge).toHaveClass('bg-destructive')
  })

  it('should render with outline variant classes', () => {
    const { container } = render(<Badge variant="outline">Outline</Badge>)
    const badge = container.firstChild as HTMLElement
    
    expect(badge).toHaveClass('text-foreground')
  })

  it('should render with custom className', () => {
    const { container } = render(<Badge className="custom-badge">Custom</Badge>)
    const badge = container.firstChild as HTMLElement
    
    expect(badge).toHaveClass('custom-badge')
  })

  it('should support custom HTML attributes', () => {
    const { container } = render(
      <Badge data-testid="my-badge" aria-label="Status badge">
        Status
      </Badge>
    )
    const badge = container.firstChild as HTMLElement
    
    expect(badge).toHaveAttribute('data-testid', 'my-badge')
    expect(badge).toHaveAttribute('aria-label', 'Status badge')
  })

  it('should render children correctly', () => {
    render(
      <Badge>
        <span>Icon</span> Text
      </Badge>
    )
    
    expect(screen.getByText('Icon')).toBeInTheDocument()
    expect(screen.getByText(/Text/)).toBeInTheDocument()
  })
})

