import { Test, TestingModule } from '@nestjs/testing'
import { DocumentParserService } from './document-parser.service'
import JSZip from 'jszip'

describe('DocumentParserService - PPTX Parsing', () => {
  let service: DocumentParserService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentParserService],
    }).compile()

    service = module.get<DocumentParserService>(DocumentParserService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should parse PPTX slide by slide, decode XML entities, and analyze embedded images', async () => {
    // 1. Tạo tệp PPTX mock in-memory sử dụng JSZip
    const zip = new JSZip()

    // Slide 1 chứa văn bản có thực thể XML & hình ảnh tham chiếu
    zip.file('ppt/slides/slide1.xml', '<p:sld><a:t>Hello Slide 1</a:t><a:t> &amp; Welcome</a:t></p:sld>')

    // Slide 2 chỉ chứa văn bản thông thường
    zip.file('ppt/slides/slide2.xml', '<p:sld><a:t>Nội dung Slide số 2</a:t></p:sld>')

    // Khai báo tệp quan hệ cho Slide 1 (tham chiếu đến image1.png)
    zip.file(
      'ppt/slides/_rels/slide1.xml.rels',
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
      </Relationships>`,
    )

    // Tệp hình ảnh mock
    zip.file('ppt/media/image1.png', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) // PNG magic bytes

    const pptxBuffer = await zip.generateAsync({ type: 'nodebuffer' })

    // 2. Mock hàm private analyzeImage của DocumentParserService
    const spyAnalyzeImage = jest
      .spyOn(service as any, 'analyzeImage')
      .mockResolvedValue('Mô tả sơ đồ hệ thống Study Hub')

    // 3. Thực hiện trích xuất
    const result = await service.parseDocument(pptxBuffer, 'baitap.pptx')

    // 4. Xác nhận kết quả
    expect(result).toBeDefined()
    expect(result.length).toBe(2) // 2 slides

    // Kiểm tra slide 1: Đã giải mã thực thể XML & chứa mô tả ảnh phân tích
    expect(result[0]).toContain('Hello Slide 1')
    expect(result[0]).toContain('& Welcome')
    expect(result[0]).toContain('[Mô tả hình ảnh trong tài liệu: Mô tả sơ đồ hệ thống Study Hub]')

    // Kiểm tra slide 2: Đọc đúng text
    expect(result[1]).toBe('Nội dung Slide số 2')

    // Đảm bảo analyzeImage được gọi với đúng buffer và mimeType
    expect(spyAnalyzeImage).toHaveBeenCalledWith(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), 'image/png')

    spyAnalyzeImage.mockRestore()
  })

  it('should return empty list and warn if PPTX has no slide files', async () => {
    const zip = new JSZip()
    const pptxBuffer = await zip.generateAsync({ type: 'nodebuffer' })

    const result = await service.parseDocument(pptxBuffer, 'empty.pptx')
    expect(result).toEqual([])
  })
})
