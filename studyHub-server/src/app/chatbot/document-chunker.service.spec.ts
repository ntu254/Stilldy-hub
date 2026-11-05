import { Test, TestingModule } from '@nestjs/testing'
import { DocumentChunkerService } from './document-chunker.service'

describe('DocumentChunkerService', () => {
  let service: DocumentChunkerService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentChunkerService],
    }).compile()

    service = module.get<DocumentChunkerService>(DocumentChunkerService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('countTokens', () => {
    it('should return 0 for empty string', () => {
      expect(service.countTokens('')).toBe(0)
    })

    it('should return 0 for whitespace only', () => {
      expect(service.countTokens('   ')).toBe(0)
    })

    it('should count tokens for English text', () => {
      const text = 'Hello world, this is a test sentence.'
      const count = service.countTokens(text)
      expect(count).toBeGreaterThan(0)
      expect(count).toBeLessThan(20) // A short sentence should have few tokens
    })

    it('should count tokens for Vietnamese text', () => {
      const text = 'Xin chào thế giới, đây là một câu thử nghiệm.'
      const count = service.countTokens(text)
      expect(count).toBeGreaterThan(0)
    })
  })

  describe('splitByHeadings', () => {
    it('should handle text with no headings as a single section', () => {
      const text = 'This is just plain text without any headings.\nAnother line here.'
      const sections = service.splitByHeadings(text)
      expect(sections.length).toBe(1)
      expect(sections[0].heading).toBe('')
      expect(sections[0].headingLevel).toBe(0)
      expect(sections[0].content).toContain('This is just plain text')
    })

    it('should split text by H1 headings', () => {
      const text = '# Heading 1\nContent of section 1\n# Heading 2\nContent of section 2'
      const sections = service.splitByHeadings(text)
      expect(sections.length).toBe(2)
      expect(sections[0].heading).toBe('Heading 1')
      expect(sections[0].headingLevel).toBe(1)
      expect(sections[0].content).toContain('Content of section 1')
      expect(sections[1].heading).toBe('Heading 2')
      expect(sections[1].headingLevel).toBe(1)
      expect(sections[1].content).toContain('Content of section 2')
    })

    it('should handle multiple heading levels', () => {
      const text = '# Chapter 1\nIntro\n## Section 1.1\nDetails\n### Subsection 1.1.1\nMore details'
      const sections = service.splitByHeadings(text)
      expect(sections.length).toBe(3)
      expect(sections[0].headingLevel).toBe(1)
      expect(sections[1].headingLevel).toBe(2)
      expect(sections[2].headingLevel).toBe(3)
    })

    it('should handle content before the first heading', () => {
      const text = 'Some preamble text\n# First Heading\nContent after heading'
      const sections = service.splitByHeadings(text)
      expect(sections.length).toBe(2)
      expect(sections[0].heading).toBe('')
      expect(sections[0].content).toBe('Some preamble text')
      expect(sections[1].heading).toBe('First Heading')
    })

    it('should handle consecutive headings with no content between', () => {
      const text = '# Heading 1\n# Heading 2\nSome content'
      const sections = service.splitByHeadings(text)
      expect(sections.length).toBe(2)
      expect(sections[0].heading).toBe('Heading 1')
      expect(sections[1].heading).toBe('Heading 2')
      expect(sections[1].content).toContain('Some content')
    })

    it('should handle empty sections correctly', () => {
      const text = ''
      const sections = service.splitByHeadings(text)
      expect(sections.length).toBe(0)
    })
  })

  describe('splitSectionByTokens', () => {
    it('should return text as-is when under maxTokens', () => {
      const text = 'Short text that is well under the limit.'
      const chunks = service.splitSectionByTokens(text, 500, 75)
      expect(chunks.length).toBe(1)
      expect(chunks[0]).toBe(text)
    })

    it('should split long text into multiple chunks', () => {
      // Generate text that exceeds 500 tokens
      const words = Array.from({ length: 600 }, (_, i) => `word${i}`)
      const longText = words.join(' ')
      const chunks = service.splitSectionByTokens(longText, 500, 75)
      expect(chunks.length).toBeGreaterThan(1)
    })

    it('should create overlapping chunks', () => {
      // Generate text that exceeds 500 tokens using natural-like words
      const sentences = Array.from({ length: 100 }, (_, i) => `This is sentence number ${i} in the document.`)
      const longText = sentences.join(' ')
      const chunks = service.splitSectionByTokens(longText, 500, 75)

      expect(chunks.length).toBeGreaterThan(1)

      if (chunks.length >= 2) {
        // The end of chunk 1 should overlap with the beginning of chunk 2
        // Check that the last ~200 characters of chunk 1 appear somewhere in chunk 2
        const endOfChunk1 = chunks[0].slice(-200)
        const startOfChunk2 = chunks[1].slice(0, 500)

        // There should be shared text between the end of chunk 1 and start of chunk 2
        // Find a substring that exists in both
        const overlapFound = endOfChunk1.split(' ').some((word) => word.length > 3 && startOfChunk2.includes(word))
        expect(overlapFound).toBe(true)
      }
    })

    it('should not produce empty chunks', () => {
      const words = Array.from({ length: 800 }, (_, i) => `word${i}`)
      const longText = words.join(' ')
      const chunks = service.splitSectionByTokens(longText, 500, 75)
      for (const chunk of chunks) {
        expect(chunk.trim().length).toBeGreaterThan(0)
      }
    })
  })

  describe('chunkDocument', () => {
    it('should chunk a document with headings where sections are under limit', () => {
      const fullText = '# Section A\nShort content A\n# Section B\nShort content B'
      const results = service.chunkDocument(fullText, [], 500, 75)
      expect(results.length).toBe(2)
      expect(results[0].headingContext).toBe('Section A')
      expect(results[0].text).toContain('Short content A')
      expect(results[1].headingContext).toBe('Section B')
      expect(results[1].text).toContain('Short content B')
    })

    it('should split oversized sections', () => {
      const longContent = Array.from({ length: 600 }, (_, i) => `word${i}`).join(' ')
      const fullText = `# Big Section\n${longContent}`
      const results = service.chunkDocument(fullText, [], 500, 75)
      expect(results.length).toBeGreaterThan(1)
      // All chunks should reference the same heading
      for (const chunk of results) {
        expect(chunk.headingContext).toBe('Big Section')
      }
    })

    it('should handle document with no headings', () => {
      const fullText = 'Just plain text without any markdown headings.'
      const results = service.chunkDocument(fullText, [], 500, 75)
      expect(results.length).toBe(1)
      expect(results[0].headingContext).toBe('')
      expect(results[0].text).toContain('Just plain text')
    })

    it('should compute page numbers from pageBreaks', () => {
      // fullText has two "pages": first 50 chars on page 1, rest on page 2
      const page1 = '# Page 1 Heading\nSome content on page one here.'
      const page2 = '\n# Page 2 Heading\nSome content on page two here.'
      const fullText = page1 + page2
      const pageBreaks = [page1.length]

      const results = service.chunkDocument(fullText, pageBreaks, 500, 75)
      expect(results.length).toBe(2)
      expect(results[0].pageNumber).toBe(1)
      expect(results[1].pageNumber).toBe(2)
    })

    it('should handle empty document', () => {
      const results = service.chunkDocument('', [], 500, 75)
      expect(results.length).toBe(0)
    })

    it('should handle Vietnamese text with headings', () => {
      const fullText = '# Chương 1: Giới thiệu\nĐây là nội dung chương 1.\n## 1.1 Tổng quan\nMô tả tổng quan.'
      const results = service.chunkDocument(fullText, [], 500, 75)
      expect(results.length).toBeGreaterThanOrEqual(2)
      expect(results[0].headingContext).toBe('Chương 1: Giới thiệu')
    })
  })
})
