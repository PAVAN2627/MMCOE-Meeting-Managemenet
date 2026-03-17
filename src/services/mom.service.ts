import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { Meeting } from '@/types/meeting.types';
import { Task } from '@/types/task.types';
import { storageService } from './storage.service';

class MoMService {
  /**
   * Generate Minutes of Meeting (MoM) document in DOCX format
   */
  async generateMoM(
    meeting: Meeting,
    summary: string,
    decisions: string[],
    actionItems: Task[]
  ): Promise<Blob> {
    try {
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              // Title
              new Paragraph({
                text: 'MINUTES OF MEETING',
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
              }),

              // Meeting Title
              new Paragraph({
                text: meeting.title,
                heading: HeadingLevel.HEADING_2,
                spacing: { after: 200 },
              }),

              // Meeting Details
              new Paragraph({
                children: [
                  new TextRun({ text: 'Date: ', bold: true }),
                  new TextRun(meeting.date.toDate().toLocaleDateString()),
                ],
                spacing: { after: 100 },
              }),

              new Paragraph({
                children: [
                  new TextRun({ text: 'Time: ', bold: true }),
                  new TextRun(meeting.time),
                ],
                spacing: { after: 100 },
              }),

              new Paragraph({
                children: [
                  new TextRun({ text: 'Duration: ', bold: true }),
                  new TextRun(`${meeting.duration} minutes`),
                ],
                spacing: { after: 100 },
              }),

              new Paragraph({
                children: [
                  new TextRun({ text: 'Type: ', bold: true }),
                  new TextRun(meeting.meetingType.toUpperCase()),
                ],
                spacing: { after: 200 },
              }),

              // Participants
              new Paragraph({
                text: 'Participants',
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 200, after: 100 },
              }),

              ...meeting.participants.map(
                (participantId) =>
                  new Paragraph({
                    text: `• ${participantId}`,
                    spacing: { after: 50 },
                  })
              ),

              // Agenda Items
              new Paragraph({
                text: 'Agenda',
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 200, after: 100 },
              }),

              ...meeting.agendaItems.map(
                (item) =>
                  new Paragraph({
                    children: [
                      new TextRun({ text: `${item.order}. `, bold: true }),
                      new TextRun({ text: item.title, bold: true }),
                      new TextRun({ text: `\n${item.description}` }),
                    ],
                    spacing: { after: 100 },
                  })
              ),

              // Summary
              new Paragraph({
                text: 'Meeting Summary',
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 200, after: 100 },
              }),

              new Paragraph({
                text: summary,
                spacing: { after: 200 },
              }),

              // Decisions
              new Paragraph({
                text: 'Decisions Made',
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 200, after: 100 },
              }),

              ...decisions.map(
                (decision) =>
                  new Paragraph({
                    text: `• ${decision}`,
                    spacing: { after: 50 },
                  })
              ),

              // Action Items
              new Paragraph({
                text: 'Action Items',
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 200, after: 100 },
              }),

              ...actionItems.map(
                (task) =>
                  new Paragraph({
                    children: [
                      new TextRun({ text: '• ', bold: true }),
                      new TextRun({ text: task.description }),
                      new TextRun({ text: ` (Assigned to: ${task.assigneeId})` }),
                      task.deadline
                        ? new TextRun({
                            text: ` - Due: ${task.deadline.toDate().toLocaleDateString()}`,
                            italics: true,
                          })
                        : new TextRun(''),
                    ],
                    spacing: { after: 100 },
                  })
              ),

              // Footer
              new Paragraph({
                text: `\nGenerated on ${new Date().toLocaleDateString()}`,
                alignment: AlignmentType.CENTER,
                spacing: { before: 400 },
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      return blob;
    } catch (error) {
      console.error('Error generating MoM:', error);
      throw error;
    }
  }

  /**
   * Upload generated MoM to Firebase Storage
   */
  async uploadMoM(meetingId: string, momBlob: Blob, meetingTitle: string): Promise<string> {
    try {
      const fileName = `${meetingTitle.replace(/[^a-z0-9]/gi, '_')}_MoM.docx`;
      const file = new File([momBlob], fileName, {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const url = await storageService.uploadMoM(meetingId, file);
      return url;
    } catch (error) {
      console.error('Error uploading MoM:', error);
      throw error;
    }
  }

  /**
   * Generate and upload MoM in one operation
   */
  async generateAndUploadMoM(
    meeting: Meeting,
    summary: string,
    decisions: string[],
    actionItems: Task[]
  ): Promise<string> {
    const momBlob = await this.generateMoM(meeting, summary, decisions, actionItems);
    const momUrl = await this.uploadMoM(meeting.id, momBlob, meeting.title);
    return momUrl;
  }
}

export const momService = new MoMService();
