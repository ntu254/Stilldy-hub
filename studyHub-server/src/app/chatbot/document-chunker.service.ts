import { Injectable, Logger } from '@nestjs/common'
import { encoding_for_model } from 'tiktoken'

/**
 * Đại diện cho một section được tách theo heading
 */
export interface HeadingSection {
  heading: string // Nội dung heading (e.g. "Chương 1: Giới thiệu")
  headingLevel: number // 1, 2, 3... (0 = không có heading)
  content: string // Nội dung body kèm heading
}

/**
 * Kết quả chunking của một tài liệu
 */
export interface DocumentChunkResult {
  text: string
  headingContext: string // Heading cha gần nhất
  pageNumber: number
}

/**
 * Kết quả trả về từ DocumentParserService sau khi bổ sung heading markers
 */
export interface ParsedDocument {
  fullTextWithHeadings: string // Toàn bộ văn bản kèm heading markers
  pageBreaks: number[] // Vị trí character index đánh dấu page break
}

// Regex nhận diện heading markdown (# H1, ## H2, ### H3, ...)
const HEADING_REGEX = /^(#{1,6})\s+(.+)$/

@Injectable()
export class DocumentChunkerService {
  private readonly logger = new Logger(DocumentChunkerService.name)
  private readonly encoder = encoding_for_model('gpt-4o')

  /**
   * Đếm số token trong một đoạn văn bản sử dụng tiktoken
   */
  countTokens(text: string): number {
    if (!text || text.trim().length === 0) return 0
    return this.encoder.encode(text).length
  }

  /**
   * Tách văn bản thành các section dựa trên heading markers (markdown)
   * Mỗi heading bắt đầu một section mới, bao gồm cả nội dung phía dưới heading đó
   * cho đến khi gặp heading tiếp theo có cùng cấp hoặc cao hơn.
   */
  splitByHeadings(fullText: string): HeadingSection[] {
    const lines = fullText.split('\n')
    const sections: HeadingSection[] = []

    let currentHeading = ''
    let currentLevel = 0
    let currentLines: string[] = []

    for (const line of lines) {
      const match = line.match(HEADING_REGEX)

      if (match) {
        // Gặp heading mới → lưu section trước đó (nếu có nội dung)
        if (currentLines.length > 0) {
          const content = currentLines.join('\n').trim()
          if (content.length > 0) {
            sections.push({
              heading: currentHeading,
              headingLevel: currentLevel,
              content,
            })
          }
        }

        // Bắt đầu section mới
        currentLevel = match[1].length // Số dấu # = heading level
        currentHeading = match[2].trim()
        currentLines = [line]
      } else {
        currentLines.push(line)
      }
    }

    // Lưu section cuối cùng
    if (currentLines.length > 0) {
      const content = currentLines.join('\n').trim()
      if (content.length > 0) {
        sections.push({
          heading: currentHeading,
          headingLevel: currentLevel,
          content,
        })
      }
    }

    return sections
  }

  /**
   * Split một đoạn text thành các chunk nhỏ hơn theo token boundary
   * Khi đoạn text > maxTokens, chia nhỏ với overlap tokens
   * Cắt tại khoảng trắng gần nhất để không phá vỡ từ
   */
  splitSectionByTokens(text: string, maxTokens: number = 500, overlap: number = 75): string[] {
    const totalTokens = this.countTokens(text)

    // Nếu đoạn text đủ nhỏ, trả về nguyên vẹn
    if (totalTokens <= maxTokens) {
      return [text]
    }

    const chunks: string[] = []
    const words = text.split(/(\s+)/) // Giữ lại cả whitespace để ghép lại chính xác

    let currentChunkWords: string[] = []
    let currentTokenCount = 0

    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      const wordTokens = this.countTokens(word)

      if (currentTokenCount + wordTokens > maxTokens && currentChunkWords.length > 0) {
        // Chunk hiện tại đã đầy → lưu lại
        const chunkText = currentChunkWords.join('').trim()
        if (chunkText.length > 0) {
          chunks.push(chunkText)
        }

        // Tính overlap: lùi lại để lấy ~overlap tokens từ cuối chunk hiện tại
        const overlapWords: string[] = []
        let overlapTokenCount = 0

        for (let j = currentChunkWords.length - 1; j >= 0; j--) {
          const overlapWord = currentChunkWords[j]
          const overlapWordTokens = this.countTokens(overlapWord)
          if (overlapTokenCount + overlapWordTokens > overlap) break
          overlapWords.unshift(overlapWord)
          overlapTokenCount += overlapWordTokens
        }

        currentChunkWords = [...overlapWords]
        currentTokenCount = overlapTokenCount
      }

      currentChunkWords.push(word)
      currentTokenCount += wordTokens
    }

    // Lưu chunk cuối cùng
    if (currentChunkWords.length > 0) {
      const chunkText = currentChunkWords.join('').trim()
      if (chunkText.length > 0) {
        chunks.push(chunkText)
      }
    }

    return chunks
  }

  /**
   * Xác định page number dựa trên vị trí character trong full text và mảng pageBreaks
   */
  private getPageNumber(charIndex: number, pageBreaks: number[]): number {
    if (pageBreaks.length === 0) return 1

    for (let i = pageBreaks.length - 1; i >= 0; i--) {
      if (charIndex >= pageBreaks[i]) {
        return i + 2 // page 1 bắt đầu từ index 0, page 2 từ pageBreaks[0]...
      }
    }
    return 1
  }

  /**
   * Orchestrator chính: Chunk toàn bộ tài liệu theo heading, split nếu > 500 tokens
   *
   * @param fullText - Toàn bộ văn bản kèm heading markers
   * @param pageBreaks - Mảng vị trí character index đánh dấu page break
   * @param maxTokens - Giới hạn token tối đa mỗi chunk (mặc định 500)
   * @param overlap - Số token overlap khi split (mặc định 75)
   */
  chunkDocument(
    fullText: string,
    pageBreaks: number[],
    maxTokens: number = 500,
    overlap: number = 75,
  ): DocumentChunkResult[] {
    const results: DocumentChunkResult[] = []

    // Bước 1: Tách theo heading
    const sections = this.splitByHeadings(fullText)

    this.logger.log(`Tách được ${sections.length} section(s) theo heading.`)

    for (const section of sections) {
      const sectionTokens = this.countTokens(section.content)

      // Tìm vị trí section trong full text để tính page number
      const sectionIndex = fullText.indexOf(section.content)
      const pageNumber = this.getPageNumber(sectionIndex, pageBreaks)

      if (sectionTokens <= maxTokens) {
        // Section đủ nhỏ → giữ nguyên làm 1 chunk
        results.push({
          text: section.content,
          headingContext: section.heading,
          pageNumber,
        })
      } else {
        // Section quá lớn → split theo token boundary
        this.logger.log(
          `Section "${section.heading || '(no heading)'}" có ${sectionTokens} tokens > ${maxTokens}. Tiến hành split...`,
        )

        const subChunks = this.splitSectionByTokens(section.content, maxTokens, overlap)

        for (let i = 0; i < subChunks.length; i++) {
          const subChunkIndex = fullText.indexOf(subChunks[i])
          const subPageNumber = subChunkIndex >= 0 ? this.getPageNumber(subChunkIndex, pageBreaks) : pageNumber

          results.push({
            text: subChunks[i],
            headingContext: section.heading,
            pageNumber: subPageNumber,
          })
        }
      }
    }

    this.logger.log(`Tổng cộng tạo được ${results.length} chunk(s) cho tài liệu.`)
    return results
  }
}
