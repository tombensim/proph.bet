import { updateProfileImage } from '@/app/actions/user'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Mock next-auth before other imports
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('next-auth/providers/google', () => ({
  __esModule: true,
  default: jest.fn(),
}))

// Mock dependencies
jest.mock('@/lib/auth')
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      update: jest.fn(),
    },
  },
  prisma: {
    user: {
      update: jest.fn(),
    },
  },
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockPrisma = prisma as any

describe('User Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('updateProfileImage', () => {
    it('should return error if user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null)

      const result = await updateProfileImage('https://example.com/image.jpg')

      expect(result).toEqual({ error: 'Unauthorized' })
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('should return error if user id is missing', async () => {
      mockAuth.mockResolvedValue({ user: {} } as any)

      const result = await updateProfileImage('https://example.com/image.jpg')

      expect(result).toEqual({ error: 'Unauthorized' })
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('should update profile image successfully', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      }

      mockAuth.mockResolvedValue(mockSession as any)
      mockPrisma.user.update.mockResolvedValue({
        id: 'user-123',
        image: 'https://example.com/image.jpg',
      })

      const result = await updateProfileImage('https://example.com/image.jpg')

      expect(result).toEqual({ success: true })
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { image: 'https://example.com/image.jpg' },
      })
    })

    it('should handle database errors gracefully', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      }

      mockAuth.mockResolvedValue(mockSession as any)
      mockPrisma.user.update.mockRejectedValue(new Error('Database error'))

      const result = await updateProfileImage('https://example.com/image.jpg')

      expect(result).toEqual({ error: 'Failed to update profile image' })
    })
  })
})

