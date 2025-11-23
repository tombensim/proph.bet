import { createMarketSchema } from '@/lib/schemas'
import { MarketType, AssetType } from '@prisma/client'

describe('Schemas', () => {
  describe('createMarketSchema', () => {
    const validBaseData = {
      title: 'Will it rain tomorrow?',
      description: 'A prediction about rain',
      type: MarketType.BINARY,
      resolutionDate: new Date('2025-12-31'),
      arenaId: 'arena-123',
    }

    it('should validate a valid binary market', () => {
      const result = createMarketSchema.safeParse(validBaseData)
      expect(result.success).toBe(true)
    })

    it('should reject a title that is too short', () => {
      const result = createMarketSchema.safeParse({
        ...validBaseData,
        title: 'Hi',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 5 characters')
      }
    })

    it('should require a resolution date', () => {
      const { resolutionDate, ...dataWithoutDate } = validBaseData
      const result = createMarketSchema.safeParse(dataWithoutDate)
      expect(result.success).toBe(false)
    })

    it('should require an arenaId', () => {
      const result = createMarketSchema.safeParse({
        ...validBaseData,
        arenaId: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Arena ID is required')
      }
    })

    it('should validate a multiple choice market with options', () => {
      const result = createMarketSchema.safeParse({
        ...validBaseData,
        type: MarketType.MULTIPLE_CHOICE,
        options: [{ value: 'Option A' }, { value: 'Option B' }],
      })
      expect(result.success).toBe(true)
    })

    it('should reject a multiple choice market without enough options', () => {
      const result = createMarketSchema.safeParse({
        ...validBaseData,
        type: MarketType.MULTIPLE_CHOICE,
        options: [{ value: 'Option A' }],
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 2 options')
      }
    })

    it('should validate assets with valid URLs', () => {
      const result = createMarketSchema.safeParse({
        ...validBaseData,
        assets: [
          {
            type: AssetType.IMAGE,
            url: 'https://example.com/image.jpg',
            label: 'Test Image',
          },
        ],
      })
      expect(result.success).toBe(true)
    })

    it('should reject assets with invalid URLs', () => {
      const result = createMarketSchema.safeParse({
        ...validBaseData,
        assets: [
          {
            type: AssetType.IMAGE,
            url: 'not-a-valid-url',
            label: 'Test Image',
          },
        ],
      })
      expect(result.success).toBe(false)
    })

    it('should accept optional fields', () => {
      const result = createMarketSchema.safeParse({
        ...validBaseData,
        minBet: 10,
        maxBet: 100,
        rangeMin: 0,
        rangeMax: 100,
        rangeBins: 10,
        hiddenFromUserIds: ['user1', 'user2'],
        hideBetsFromUserIds: ['user3'],
      })
      expect(result.success).toBe(true)
    })
  })
})

