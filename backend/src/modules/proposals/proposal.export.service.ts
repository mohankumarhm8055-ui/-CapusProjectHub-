import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Footer,
  PageNumber,
} from 'docx'
import PDFDocument from 'pdfkit'
import { IProposal } from './proposal.model.js'

export class ProposalExportService {
  /**
   * Generates a fully formatted, valid DOCX binary buffer
   */
  async generateDocx(proposal: IProposal): Promise<Buffer> {
    const template = proposal.template
    const sections = proposal.sections.sort((a, b) => a.order - b.order)

    const docChildren: Paragraph[] = []

    // 1. Cover / Header Metadata
    docChildren.push(
      new Paragraph({
        text: template.college.toUpperCase(),
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
      new Paragraph({
        text: template.department,
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
      new Paragraph({
        text: `ACADEMIC YEAR: ${template.academicYear} | ${template.semester.toUpperCase()}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
      }),
      new Paragraph({
        text: proposal.projectTitle,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 360 },
      })
    )

    // 2. Add each section
    for (const sec of sections) {
      docChildren.push(
        new Paragraph({
          text: `${sec.order}. ${sec.title}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        })
      )

      // Split lines/paragraphs
      const paragraphs = sec.content.split('\n\n')
      for (const p of paragraphs) {
        if (!p.trim()) continue

        // Check if list item or regular text
        if (p.trim().startsWith('- ') || p.trim().startsWith('* ')) {
          const lines = p.split('\n')
          for (const line of lines) {
            docChildren.push(
              new Paragraph({
                children: [new TextRun(line.replace(/^[-*]\s*/, '• '))],
                bullet: { level: 0 },
                spacing: { after: 80 },
              })
            )
          }
        } else {
          docChildren.push(
            new Paragraph({
              children: [new TextRun(p.trim())],
              spacing: { after: 140, line: 276 }, // 1.15 line spacing
            })
          )
        }
      }
    }

    // 3. Assemble document
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440, // 1 inch
                bottom: 1440,
                left: 1440,
                right: 1440,
              },
            },
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun(
                      `CampusProjectHub Academic Proposal | ${template.templateId} v${template.templateVersion || '1.0.0'} | Page `
                    ),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                    }),
                    new TextRun(' of '),
                    new TextRun({
                      children: [PageNumber.TOTAL_PAGES],
                    }),
                  ],
                }),
              ],
            }),
          },
          children: docChildren,
        },
      ],
    })

    const buffer = await Packer.toBuffer(doc)

    // Validate DOCX PK Zip header signature
    if (!this.isValidDocxBuffer(buffer)) {
      throw new Error('DOCX export failed buffer validation.')
    }

    return buffer
  }

  /**
   * Generates a fully formatted, valid PDF binary buffer
   */
  async generatePdf(proposal: IProposal): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          bufferPages: true,
          info: {
            Title: proposal.projectTitle,
            Author: proposal.studentId,
            Subject: `${proposal.template.documentType} - CampusProjectHub`,
            Keywords: 'Academic Proposal, Capstone, CampusProjectHub, IEEE 830',
          },
        })

        const chunks: Buffer[] = []
        doc.on('data', (chunk) => chunks.push(chunk))
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks)
          if (!this.isValidPdfBuffer(pdfBuffer)) {
            reject(new Error('PDF export failed buffer validation.'))
          } else {
            resolve(pdfBuffer)
          }
        })
        doc.on('error', (err) => reject(err))

        // Document Header
        doc.fontSize(10).fillColor('#64748B').text(proposal.template.college.toUpperCase(), { align: 'center' })
        doc.fontSize(9).text(proposal.template.department, { align: 'center' })
        doc.fontSize(8).text(`Academic Year: ${proposal.template.academicYear} | ${proposal.template.semester}`, {
          align: 'center',
        })
        doc.moveDown(1.5)

        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .fillColor('#0F172A')
          .text(proposal.projectTitle, { align: 'center' })
        doc.moveDown(0.5)

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#475569')
          .text(`Document Type: ${proposal.documentType.replace(/_/g, ' ')} | Version: v${proposal.activeVersionNumber}`, {
            align: 'center',
          })
        doc.moveDown(1.5)

        // Draw Divider
        doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke()
        doc.moveDown(1)

        // Sections
        const sections = proposal.sections.sort((a, b) => a.order - b.order)
        for (const sec of sections) {
          // Check for page break if near bottom
          if (doc.y > 700) {
            doc.addPage()
          }

          doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .fillColor('#1E293B')
            .text(`${sec.order}. ${sec.title}`)
          doc.moveDown(0.4)

          doc
            .fontSize(9.5)
            .font('Helvetica')
            .fillColor('#334155')
            .text(sec.content, {
              align: 'justify',
              lineGap: 3,
            })
          doc.moveDown(1.2)
        }

        // Add page numbers in footer
        const range = doc.bufferedPageRange()
        for (let i = 0; i < range.count; i++) {
          doc.switchToPage(i)
          doc
            .fontSize(8)
            .fillColor('#94A3B8')
            .text(
              `CampusProjectHub — Page ${i + 1} of ${range.count}`,
              50,
              doc.page.height - 40,
              { align: 'center', width: 495 }
            )
        }

        doc.end()
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * Validates DOCX PK Zip header signature (0x50, 0x4B, 0x03, 0x04)
   */
  isValidDocxBuffer(buffer: Buffer): boolean {
    if (!buffer || buffer.length < 4) return false
    return (
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    )
  }

  /**
   * Validates PDF header signature (%PDF-)
   */
  isValidPdfBuffer(buffer: Buffer): boolean {
    if (!buffer || buffer.length < 5) return false
    const header = buffer.subarray(0, 5).toString('ascii')
    return header.startsWith('%PDF-')
  }
}

export const proposalExportService = new ProposalExportService()
