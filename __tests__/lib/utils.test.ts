import { cn, generateGradient, formatBytes } from '@/lib/utils'

describe('Utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('should handle conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
    })

    it('should merge tailwind classes correctly', () => {
      expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
    })
  })

  describe('generateGradient', () => {
    it('should generate a gradient string', () => {
      const gradient = generateGradient('test-id')
      expect(gradient).toContain('linear-gradient')
      expect(gradient).toContain('deg')
      expect(gradient).toContain('hsl')
    })

    it('should generate consistent gradients for the same ID', () => {
      const gradient1 = generateGradient('test-id')
      const gradient2 = generateGradient('test-id')
      expect(gradient1).toBe(gradient2)
    })

    it('should generate different gradients for different IDs', () => {
      const gradient1 = generateGradient('test-id-1')
      const gradient2 = generateGradient('test-id-2')
      expect(gradient1).not.toBe(gradient2)
    })
  })

  describe('formatBytes', () => {
    it('should format 0 bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes')
    })

    it('should format bytes correctly', () => {
      expect(formatBytes(500)).toBe('500 Bytes')
    })

    it('should format kilobytes correctly', () => {
      expect(formatBytes(1024)).toBe('1 KB')
    })

    it('should format megabytes correctly', () => {
      expect(formatBytes(1024 * 1024)).toBe('1 MB')
    })

    it('should format gigabytes correctly', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB')
    })

    it('should respect decimal places', () => {
      expect(formatBytes(1536, 0)).toBe('2 KB')
      expect(formatBytes(1536, 1)).toBe('1.5 KB')
      expect(formatBytes(1536, 2)).toBe('1.5 KB')
    })
  })
})

