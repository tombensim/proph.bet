import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  it('should render a button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('should call onClick when clicked', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()
    
    render(<Button onClick={handleClick}>Click me</Button>)
    await user.click(screen.getByRole('button'))
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>)
    const button = screen.getByRole('button')
    
    expect(button).toBeDisabled()
  })

  it('should not call onClick when disabled', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()
    
    render(<Button onClick={handleClick} disabled>Disabled Button</Button>)
    await user.click(screen.getByRole('button'))
    
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('should render with default variant classes', () => {
    render(<Button>Default Button</Button>)
    const button = screen.getByRole('button')
    
    expect(button).toHaveClass('bg-primary')
  })

  it('should render with destructive variant classes', () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByRole('button')
    
    expect(button).toHaveClass('bg-destructive')
  })

  it('should render with outline variant classes', () => {
    render(<Button variant="outline">Outline</Button>)
    const button = screen.getByRole('button')
    
    expect(button).toHaveClass('border')
    expect(button).toHaveClass('bg-background')
  })

  it('should render with custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    const button = screen.getByRole('button')
    
    expect(button).toHaveClass('custom-class')
  })

  it('should render with different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-8')

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-10')
  })

  it('should support type attribute', () => {
    render(<Button type="submit">Submit</Button>)
    const button = screen.getByRole('button')
    
    expect(button).toHaveAttribute('type', 'submit')
  })
})

