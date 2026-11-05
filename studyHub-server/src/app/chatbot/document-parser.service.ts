import { Injectable, Logger } from '@nestjs/common'
import * as mammoth from 'mammoth'
import JSZip from 'jszip'
import { ParsedDocument } from './document-chunker.service'

@Injectable()
export class DocumentParserService {
  private readonly logger = new Logger(DocumentParserService.name)

  /**
   * Trích xuất văn bản từ file buffer dựa trên định dạng của file.
   * Kết quả trả về là một mảng các trang văn bản (array of strings).
   * Đối với các file không phân trang như docx, txt, md thì sẽ trả về mảng có 1 phần tử là toàn bộ văn bản.
   */
  async parseDocument(fileBuffer: Buffer, fileName: string): Promise<string[]> {
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
    const pages: string[] = []

    this.logger.log(`Trích xuất văn bản cho file: "${fileName}" (định dạng: ${ext})`)

    switch (ext) {
      case '.pdf': {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(fileBuffer),
          useSystemFonts: true,
          disableFontFace: true, // Ngăn chặn nỗ lực tải font bằng DOM/CSS trong môi trường Node.js
        })

        const pdf = await loadingTask.promise
        const numPages = pdf.numPages
        this.logger.log(`Đang phân tích tài liệu PDF có ${numPages} trang...`)

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i)

          // 1. Trích xuất text thô của trang
          const textContent = await page.getTextContent()
          let pageText = textContent.items.map((item: any) => item.str).join(' ')

          // 2. Trích xuất và phân tích hình ảnh nhúng trên trang
          try {
            const images = await this.extractImagesFromPage(page)
            if (images.length > 0) {
              this.logger.log(
                `Tìm thấy ${images.length} hình ảnh trên trang ${i}. Bắt đầu phân tích hình ảnh qua Gemini...`,
              )
              for (const imgBuf of images) {
                const desc = await this.analyzeImage(imgBuf, 'image/png')
                pageText += `\n\n[Mô tả hình ảnh trong tài liệu: ${desc}]\n\n`
              }
            }
          } catch (err: any) {
            this.logger.warn(`Lỗi khi trích xuất hình ảnh trang PDF ${i}: ${err.message}`)
          }

          pages.push(pageText)
        }
        this.logger.log(`Đã trích xuất thành công ${pages.length} trang từ PDF (kèm phân tích hình ảnh).`)
        break
      }
      case '.docx': {
        const options = {
          convertImage: mammoth.images.imgElement(async (image) => {
            try {
              const imageBuffer = await image.read()
              const contentType = image.contentType // e.g. 'image/png'
              this.logger.log(`Tìm thấy hình ảnh nhúng trong file DOCX. Bắt đầu phân tích hình ảnh qua Gemini...`)
              const description = await this.analyzeImage(imageBuffer, contentType)
              return {
                src: `image-description:${description}`,
              }
            } catch (err: any) {
              this.logger.warn(`Lỗi khi phân tích hình ảnh nhúng trong DOCX: ${err.message}`)
              return { src: '' }
            }
          }),
        }

        const result = await mammoth.convertToHtml({ buffer: fileBuffer }, options)
        const htmlContent = result.value

        // Thay thế các thẻ <img> bằng mô tả hình ảnh tương ứng
        const textContentWithImages = htmlContent.replace(
          /<img src="image-description:([^"]+)"[^>]*>/g,
          '\n\n[Hình ảnh minh họa trong tài liệu: $1]\n\n',
        )

        // Loại bỏ các thẻ HTML khác để giữ lại text thô sạch sẽ phục vụ chia chunk
        const cleanText = textContentWithImages.replace(/<[^>]*>/g, ' ')
        pages.push(cleanText)
        this.logger.log(`Đã trích xuất thành công văn bản từ file DOCX (kèm mô tả ảnh inline).`)
        break
      }
      case '.txt':
      case '.md': {
        const text = fileBuffer.toString('utf-8')
        pages.push(text)
        this.logger.log(`Đã trích xuất thành công văn bản từ file ${ext.toUpperCase()}.`)
        break
      }
      case '.pptx': {
        const pptxPages = await this.parsePptx(fileBuffer)
        pages.push(...pptxPages)
        this.logger.log(`Đã trích xuất thành công ${pptxPages.length} slide từ PPTX (kèm phân tích hình ảnh).`)
        break
      }
      default:
        throw new Error(`Định dạng file ${ext} không được hỗ trợ để trích xuất văn bản.`)
    }

    return pages
  }

  /**
   * Trích xuất văn bản kèm heading markers cho chiến lược chunking theo heading.
   * Trả về ParsedDocument chứa fullTextWithHeadings và pageBreaks.
   *
   * Heading markers được thêm dựa trên:
   * - PDF: Phân tích font size (tương đối so với median font size trên trang)
   * - DOCX: Chuyển đổi HTML heading tags (<h1>-<h6>) sang markdown
   * - PPTX: Mỗi slide bắt đầu bằng "# Slide X"
   * - MD: Giữ nguyên heading markers có sẵn
   * - TXT: Giữ nguyên (fallback sang token split thuần)
   */
  async parseDocumentWithHeadings(fileBuffer: Buffer, fileName: string): Promise<ParsedDocument> {
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()

    this.logger.log(`Trích xuất văn bản kèm heading cho file: "${fileName}" (định dạng: ${ext})`)

    switch (ext) {
      case '.pdf':
        return await this.parsePdfWithHeadings(fileBuffer)

      case '.docx':
        return await this.parseDocxWithHeadings(fileBuffer)

      case '.pptx':
        return await this.parsePptxWithHeadings(fileBuffer)

      case '.txt':
      case '.md': {
        const text = fileBuffer.toString('utf-8')
        this.logger.log(`Đã trích xuất thành công văn bản từ file ${ext.toUpperCase()} kèm heading.`)
        return {
          fullTextWithHeadings: text,
          pageBreaks: [],
        }
      }

      default:
        throw new Error(`Định dạng file ${ext} không được hỗ trợ để trích xuất văn bản.`)
    }
  }

  /**
   * Trích xuất văn bản từ PDF kèm heading markers dựa trên font size.
   * So sánh font size tương đối với median font size trên trang:
   * >= 1.6x median → # (H1), >= 1.35x → ## (H2), >= 1.15x → ### (H3)
   */
  private async parsePdfWithHeadings(fileBuffer: Buffer): Promise<ParsedDocument> {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(fileBuffer),
      useSystemFonts: true,
      disableFontFace: true,
    })

    const pdf = await loadingTask.promise
    const numPages = pdf.numPages
    this.logger.log(`Đang phân tích tài liệu PDF có ${numPages} trang (kèm heading detection)...`)

    const pageBreaks: number[] = []
    let fullText = ''

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i)

      // Ghi nhận page break position
      if (i > 1) {
        pageBreaks.push(fullText.length)
      }

      // 1. Trích xuất text items kèm font size để detect headings
      const textContent = await page.getTextContent()
      let pageText = ''

      // Tính trung vị font size trên trang để làm baseline
      const fontSizes = textContent.items
        .filter((item: any) => item.str && item.str.trim().length > 0)
        .map((item: any) => {
          const transform = item.transform || []
          return Math.abs(transform[0] || transform[3] || 12)
        })

      const medianFontSize =
        fontSizes.length > 0 ? fontSizes.sort((a: number, b: number) => a - b)[Math.floor(fontSizes.length / 2)] : 12

      for (const item of textContent.items as any[]) {
        if (!item.str) continue
        const text = item.str
        if (text.trim().length === 0) {
          pageText += ' '
          continue
        }

        const transform = item.transform || []
        const fontSize = Math.abs(transform[0] || transform[3] || 12)

        // Heading detection dựa trên font size tương đối so với body text
        if (fontSize >= medianFontSize * 1.6 && text.trim().length > 0) {
          pageText += `\n# ${text.trim()}\n`
        } else if (fontSize >= medianFontSize * 1.35 && text.trim().length > 0) {
          pageText += `\n## ${text.trim()}\n`
        } else if (fontSize >= medianFontSize * 1.15 && text.trim().length > 0) {
          pageText += `\n### ${text.trim()}\n`
        } else {
          pageText += text
        }
      }

      // 2. Trích xuất và phân tích hình ảnh nhúng trên trang
      try {
        const images = await this.extractImagesFromPage(page)
        if (images.length > 0) {
          this.logger.log(
            `Tìm thấy ${images.length} hình ảnh trên trang ${i}. Bắt đầu phân tích hình ảnh qua Gemini...`,
          )
          for (const imgBuf of images) {
            const desc = await this.analyzeImage(imgBuf, 'image/png')
            pageText += `\n\n[Mô tả hình ảnh trong tài liệu: ${desc}]\n\n`
          }
        }
      } catch (err: any) {
        this.logger.warn(`Lỗi khi trích xuất hình ảnh trang PDF ${i}: ${err.message}`)
      }

      fullText += pageText + '\n'
    }

    this.logger.log(`Đã trích xuất thành công ${numPages} trang từ PDF kèm heading markers.`)
    return {
      fullTextWithHeadings: fullText.trim(),
      pageBreaks,
    }
  }

  /**
   * Trích xuất văn bản từ DOCX kèm heading markers.
   * Mammoth convert sang HTML → detect <h1>-<h6> → chuyển thành markdown heading
   */
  private async parseDocxWithHeadings(fileBuffer: Buffer): Promise<ParsedDocument> {
    const options = {
      convertImage: mammoth.images.imgElement(async (image) => {
        try {
          const imageBuffer = await image.read()
          const contentType = image.contentType
          this.logger.log(`Tìm thấy hình ảnh nhúng trong file DOCX. Bắt đầu phân tích hình ảnh qua Gemini...`)
          const description = await this.analyzeImage(imageBuffer, contentType)
          return {
            src: `image-description:${description}`,
          }
        } catch (err: any) {
          this.logger.warn(`Lỗi khi phân tích hình ảnh nhúng trong DOCX: ${err.message}`)
          return { src: '' }
        }
      }),
    }

    const result = await mammoth.convertToHtml({ buffer: fileBuffer }, options)
    const htmlContent = result.value

    // Thay thế các thẻ <img> bằng mô tả hình ảnh tương ứng
    let textContent = htmlContent.replace(
      /<img src="image-description:([^"]+)"[^>]*>/g,
      '\n\n[Hình ảnh minh họa trong tài liệu: $1]\n\n',
    )

    // Chuyển heading tags HTML sang markdown markers TRƯỚC KHI strip HTML
    textContent = textContent.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n')
    textContent = textContent.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n')
    textContent = textContent.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n')
    textContent = textContent.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n')
    textContent = textContent.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n##### $1\n')
    textContent = textContent.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '\n###### $1\n')

    // Loại bỏ các thẻ HTML còn lại
    const cleanText = textContent.replace(/<[^>]*>/g, ' ')

    this.logger.log(`Đã trích xuất thành công văn bản từ file DOCX kèm heading markers.`)
    return {
      fullTextWithHeadings: cleanText.trim(),
      pageBreaks: [], // DOCX không phân trang
    }
  }

  /**
   * Trích xuất văn bản từ PPTX kèm heading markers (mỗi slide = 1 heading)
   */
  private async parsePptxWithHeadings(fileBuffer: Buffer): Promise<ParsedDocument> {
    const pages = await this.parsePptx(fileBuffer)
    const pageBreaks: number[] = []
    let fullText = ''

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) {
        pageBreaks.push(fullText.length)
      }
      // Thêm heading marker cho mỗi slide
      fullText += `# Slide ${i + 1}\n${pages[i]}\n\n`
    }

    this.logger.log(`Đã trích xuất thành công ${pages.length} slides từ PPTX kèm heading markers.`)
    return {
      fullTextWithHeadings: fullText.trim(),
      pageBreaks,
    }
  }

  /**
   * Gọi API Gemini Multimodal để phân tích và sinh mô tả hình ảnh
   */
  private async analyzeImage(imageBuffer: Buffer, mimeType: string): Promise<string> {
    const geminiApiKey = process.env.GEMINI_API_KEY
    if (!geminiApiKey) {
      this.logger.warn('Không cấu hình GEMINI_API_KEY. Bỏ qua phân tích hình ảnh.')
      return '[Hình ảnh - Chưa cấu hình API Key]'
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: 'Bạn là trợ lý học tập. Hãy phân tích hình ảnh này xuất hiện trong tài liệu và cung cấp: 1. Trực quan hóa/Giải thích chi tiết các sơ đồ, đồ thị, hình vẽ, hoặc bảng biểu xuất hiện trong ảnh. 2. Trích xuất bất kỳ văn bản quan trọng nào (OCR). Trả về kết quả phân tích bằng tiếng Việt ngắn gọn, tập trung vào kiến thức học tập.',
                  },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: imageBuffer.toString('base64'),
                    },
                  },
                ],
              },
            ],
          }),
        },
      )

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Gemini Multimodal API error: ${response.status} - ${errText}`)
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) {
        throw new Error('Cấu trúc trả về từ Gemini không chứa văn bản mô tả.')
      }

      return text.trim()
    } catch (error: any) {
      this.logger.error(`Lỗi khi gọi API Gemini phân tích hình ảnh: ${error.message}`)
      return '[Hình ảnh - Lỗi phân tích API]'
    }
  }

  /**
   * Trích xuất các đối tượng hình ảnh từ một trang PDF
   */
  private async extractImagesFromPage(page: any): Promise<Buffer[]> {
    const images: Buffer[] = []
    try {
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
      const { OPS } = pdfjsLib
      const { PNG } = require('pngjs')
      const ops = await page.getOperatorList()

      for (let j = 0; j < ops.fnArray.length; j++) {
        if (ops.fnArray[j] === OPS.paintImageXObject) {
          const args = ops.argsArray[j]
          const imgName = args[0]
          const imgObj = page.objs.get(imgName)
          if (!imgObj) continue

          const { width, height, data: imgData } = imgObj
          if (!(imgData instanceof Uint8ClampedArray) || typeof width !== 'number' || typeof height !== 'number') {
            continue
          }

          const png = new PNG({ width, height })
          png.data = Buffer.from(this.rgbToRgba(imgData))
          images.push(PNG.sync.write(png))
        }
      }
    } catch (err: any) {
      this.logger.warn(`Lỗi trong quá trình trích xuất ảnh trên trang PDF: ${err.message}`)
    }
    return images
  }

  /**
   * Helper chuyển đổi mảng byte RGB sang RGBA để pngjs ghi file PNG hợp lệ
   */
  private rgbToRgba(imgData: Uint8ClampedArray): Uint8ClampedArray {
    const rgbaData = new Uint8ClampedArray((imgData.length / 3) * 4)
    for (let i = 0; i < imgData.length; i += 3) {
      rgbaData[(i * 4) / 3] = imgData[i]
      rgbaData[(i * 4) / 3 + 1] = imgData[i + 1]
      rgbaData[(i * 4) / 3 + 2] = imgData[i + 2]
      rgbaData[(i * 4) / 3 + 3] = 255
    }
    return rgbaData
  }

  /**
   * Trích xuất văn bản và hình ảnh nhúng từ tệp PPTX slide-by-slide
   */
  private async parsePptx(fileBuffer: Buffer): Promise<string[]> {
    const pages: string[] = []
    try {
      const zip = await JSZip.loadAsync(fileBuffer)

      // Lọc các tệp XML của slide: ppt/slides/slide*.xml
      const slideFiles = Object.keys(zip.files).filter(
        (name) => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'),
      )

      if (slideFiles.length === 0) {
        this.logger.warn('Tệp PPTX không chứa slide nào.')
        return []
      }

      // Sắp xếp các slide theo thứ tự số slide tăng dần
      slideFiles.sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10)
        const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10)
        return numA - numB
      })

      for (let i = 0; i < slideFiles.length; i++) {
        const slideName = slideFiles[i]
        const slideNum = i + 1

        let slideText = ''

        // 1. Trích xuất văn bản từ slide XML
        try {
          const content = await zip.files[slideName].async('text')
          const matches = content.match(/<a:t>([^<]*)<\/a:t>/g)
          if (matches) {
            slideText = matches
              .map((m) => this.decodeXmlEntities(m.substring(5, m.length - 6)))
              .join(' ')
              .trim()
          }
        } catch (err: any) {
          this.logger.warn(`Lỗi khi trích xuất text của Slide ${slideNum}: ${err.message}`)
        }

        // 2. Trích xuất và phân tích các hình ảnh nhúng trên slide
        try {
          const relsFile = `ppt/slides/_rels/slide${slideNum}.xml.rels`
          if (zip.files[relsFile]) {
            const relsContent = await zip.files[relsFile].async('text')

            // Tìm tất cả các quan hệ ảnh
            const imageRegex = /<Relationship\s+[^>]*Type="[^"]*relationships\/image"[^>]*Target="([^"]*)"/gi
            let match
            const imagesInSlide: { name: string; buffer: Buffer; mimeType: string }[] = []

            while ((match = imageRegex.exec(relsContent)) !== null) {
              let targetPath = match[1]
              // Chuẩn hóa đường dẫn tương đối (e.g. "../media/image1.png" -> "ppt/media/image1.png")
              if (targetPath.startsWith('../')) {
                targetPath = 'ppt/' + targetPath.substring(3)
              } else if (targetPath.startsWith('media/')) {
                targetPath = 'ppt/' + targetPath
              }

              const imgFile = zip.files[targetPath]
              if (imgFile) {
                const imgBuf = await imgFile.async('nodebuffer')
                const ext = targetPath.substring(targetPath.lastIndexOf('.')).toLowerCase()
                const mimeType =
                  ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png'
                imagesInSlide.push({ name: targetPath, buffer: imgBuf, mimeType })
              }
            }

            if (imagesInSlide.length > 0) {
              this.logger.log(
                `Tìm thấy ${imagesInSlide.length} hình ảnh trên Slide ${slideNum}. Bắt đầu phân tích hình ảnh...`,
              )
              for (const img of imagesInSlide) {
                try {
                  const desc = await this.analyzeImage(img.buffer, img.mimeType)
                  slideText += `\n\n[Mô tả hình ảnh trong tài liệu: ${desc}]\n\n`
                } catch (err: any) {
                  this.logger.warn(`Lỗi khi phân tích hình ảnh ${img.name} trên Slide ${slideNum}: ${err.message}`)
                }
              }
            }
          }
        } catch (err: any) {
          this.logger.warn(`Lỗi khi trích xuất hình ảnh của Slide ${slideNum}: ${err.message}`)
        }

        pages.push(slideText.trim())
      }
    } catch (error: any) {
      this.logger.error(`Lỗi nghiêm trọng khi giải nén/phân tích PPTX: ${error.message}`, error.stack)
    }

    return pages
  }

  /**
   * Giải mã các thực thể XML đặc biệt
   */
  private decodeXmlEntities(str: string): string {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
  }
}
