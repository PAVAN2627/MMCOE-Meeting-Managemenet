import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';
import { Notification, NotificationType } from '@/types/task.types';
import { Meeting } from '@/types/meeting.types';
import { Task } from '@/types/task.types';
import { User } from '@/types/user.types';

const EMAIL_SERVICE_URL = import.meta.env.VITE_EMAIL_SERVICE_URL;

class NotificationService {
  private notificationsCollection = collection(db, 'notifications');

  private async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    relatedId: string
  ): Promise<string> {
    try {
      const docRef = await addDoc(this.notificationsCollection, {
        userId,
        type,
        title,
        message,
        relatedId,
        read: false,
        emailSent: false,
        createdAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  private async sendEmail(emailData: any): Promise<boolean> {
    if (!EMAIL_SERVICE_URL) {
      console.warn('Email service URL not configured. Skipping email send.');
      return false;
    }

    try {
      console.log('📧 Sending email to:', emailData.email);
      console.log('📧 Email service URL:', EMAIL_SERVICE_URL);
      console.log('📧 Email data:', JSON.stringify(emailData, null, 2));
      
      // Use no-cors mode for Google Apps Script (like HackMates)
      await fetch(EMAIL_SERVICE_URL, {
        method: 'POST',
        mode: 'no-cors', // Required for Google Apps Script
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      console.log('✅ Email request sent (check Apps Script logs for delivery status)');
      return true;
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return false;
    }
  }

  async sendWelcomeEmail(userData: {
    email: string;
    name: string;
    password: string;
    role: string;
    createdBy: string;
  }): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e3a8a; color: white; padding: 30px; text-align: center;">
          <h1>🎉 Welcome to MeetSync!</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p>Hello <strong>${userData.name}</strong>,</p>
          <p>Your account has been created by <strong>${userData.createdBy}</strong>.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6;">
            <h2 style="color: #14b8a6;">Your Login Credentials</h2>
            <p><strong>👤 Name:</strong> ${userData.name}</p>
            <p><strong>📧 Email:</strong> ${userData.email}</p>
            <p><strong>🔑 Password:</strong> ${userData.password}</p>
            <p><strong>👔 Role:</strong> ${userData.role}</p>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <strong>⚠️ Important:</strong> Please change your password after first login.
          </div>
          
          <p style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px;">
            This is an automated message from MeetSync
          </p>
        </div>
      </div>
    `;

    const emailData = {
      email: userData.email,  // HackMates uses 'email' not 'to'
      subject: 'Welcome to MeetSync - Your Account Credentials',
      html: html,
    };

    await this.sendEmail(emailData);
  }

  async sendMeetingInvitation(recipientEmail: string, meetingData: {
    title: string;
    date: Date;
    time: string;
    duration: number;
    location?: string;
    description?: string;
    organizerName: string;
  }): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e3a8a; color: white; padding: 30px; text-align: center;">
          <h1>📅 Meeting Invitation</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p>You have been invited to a meeting by <strong>${meetingData.organizerName}</strong>.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6;">
            <h2 style="color: #1e3a8a;">${meetingData.title}</h2>
            ${meetingData.description ? `<p>${meetingData.description}</p>` : ''}
            <p><strong>📅 Date:</strong> ${meetingData.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p><strong>🕐 Time:</strong> ${meetingData.time}</p>
            <p><strong>⏱️ Duration:</strong> ${meetingData.duration} minutes</p>
            ${meetingData.location ? `<p><strong>📍 Location:</strong> ${meetingData.location}</p>` : ''}
          </div>
          
          <p>Please mark your calendar and join on time.</p>
          
          <p style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px;">
            This is an automated message from MeetSync
          </p>
        </div>
      </div>
    `;

    const emailData = {
      email: recipientEmail,  // HackMates uses 'email' not 'to'
      subject: `Meeting Invitation: ${meetingData.title}`,
      html: html,
    };

    await this.sendEmail(emailData);
  }

  async sendMeetingInvite(meeting: Meeting, participants: User[]): Promise<void> {
    try {
      const promises = participants.map(async participant => {
        await this.createNotification(
          participant.id,
          NotificationType.MEETING_INVITE,
          'New Meeting Invitation',
          `You have been invited to "${meeting.title}" on ${meeting.date.toDate().toLocaleDateString()}`,
          meeting.id
        );

        // Send email invitation
        await this.sendMeetingInvitation(participant.email, {
          title: meeting.title,
          date: meeting.date.toDate(),
          time: meeting.time,
          duration: meeting.duration,
          description: meeting.summary,
          organizerName: 'System',
        });
      });

      await Promise.all(promises);
      console.log(`Meeting invites sent to ${participants.length} participants`);
    } catch (error) {
      console.error('Error sending meeting invites:', error);
      throw error;
    }
  }

  async sendMeetingReminder(recipientEmail: string, meetingData: {
    title: string;
    date: Date;
    time: string;
    minutesUntil: number;
  }): Promise<void> {
    const emailData = {
      type: 'meeting_reminder',
      to: recipientEmail,
      subject: `Reminder: ${meetingData.title} in ${meetingData.minutesUntil} minutes`,
      meetingTitle: meetingData.title,
      meetingDate: meetingData.date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      meetingTime: meetingData.time,
      minutesUntil: meetingData.minutesUntil.toString(),
    };

    await this.sendEmail(emailData);
  }

  async sendTaskAssignment(recipientEmail: string, taskData: {
    title: string;
    description?: string;
    dueDate?: Date;
    priority: string;
    assignedBy: string;
  }): Promise<void> {
    const emailData = {
      type: 'task_assignment',
      to: recipientEmail,
      subject: `New Task Assigned: ${taskData.title}`,
      taskTitle: taskData.title,
      taskDescription: taskData.description,
      dueDate: taskData.dueDate?.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      priority: taskData.priority,
      assignedBy: taskData.assignedBy,
    };

    await this.sendEmail(emailData);
  }

  async sendTaskAssignmentNotification(task: Task, assignee: User): Promise<void> {
    try {
      await this.createNotification(
        assignee.id,
        NotificationType.TASK_ASSIGNED,
        'New Task Assigned',
        `You have been assigned a new task: "${task.description}"`,
        task.id
      );

      // Send email
      await this.sendTaskAssignment(assignee.email, {
        title: task.description,
        description: task.description,
        dueDate: undefined,
        priority: task.priority,
        assignedBy: 'System',
      });

      console.log(`Task assignment notification sent to ${assignee.email}`);
    } catch (error) {
      console.error('Error sending task assignment:', error);
      throw error;
    }
  }

  async sendTaskReminder(recipientEmail: string, taskData: {
    title: string;
    dueDate: Date;
    daysUntilDue: number;
  }): Promise<void> {
    const emailData = {
      type: 'task_reminder',
      to: recipientEmail,
      subject: `Task Due Soon: ${taskData.title}`,
      taskTitle: taskData.title,
      dueDate: taskData.dueDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      daysUntilDue: taskData.daysUntilDue.toString(),
    };

    await this.sendEmail(emailData);
  }

  async sendTaskReminderNotification(task: Task, assignee: User): Promise<void> {
    try {
      await this.createNotification(
        assignee.id,
        NotificationType.TASK_REMINDER,
        'Task Deadline Reminder',
        `Reminder: Task "${task.description}" is due soon`,
        task.id
      );

      console.log(`Task reminder sent to ${assignee.email}`);
    } catch (error) {
      console.error('Error sending task reminder:', error);
      throw error;
    }
  }

  async sendMoMNotification(recipientEmail: string, momData: {
    meetingTitle: string;
    meetingDate: Date;
    momUrl?: string;
  }): Promise<void> {
    const emailData = {
      type: 'mom_generated',
      to: recipientEmail,
      subject: `Minutes of Meeting Available: ${momData.meetingTitle}`,
      meetingTitle: momData.meetingTitle,
      meetingDate: momData.meetingDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      momUrl: momData.momUrl,
    };

    await this.sendEmail(emailData);
  }

  async sendSummaryApproved(meeting: Meeting, participants: User[]): Promise<void> {
    try {
      const promises = participants.map(async participant => {
        await this.createNotification(
          participant.id,
          NotificationType.SUMMARY_APPROVED,
          'Meeting Summary Approved',
          `The summary for "${meeting.title}" has been approved and is now available`,
          meeting.id
        );

        // Send MoM notification email
        await this.sendMoMNotification(participant.email, {
          meetingTitle: meeting.title,
          meetingDate: meeting.date.toDate(),
        });
      });

      await Promise.all(promises);
      console.log(`Summary approved notifications sent to ${participants.length} participants`);
    } catch (error) {
      console.error('Error sending summary approved notifications:', error);
      throw error;
    }
  }

  async sendMeetingCancellation(recipientEmail: string, meetingData: {
    title: string;
    date: Date;
    time: string;
    reason?: string;
    cancelledBy: string;
  }): Promise<void> {
    const emailData = {
      type: 'meeting_cancelled',
      to: recipientEmail,
      subject: `Meeting Cancelled: ${meetingData.title}`,
      meetingTitle: meetingData.title,
      meetingDate: meetingData.date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      meetingTime: meetingData.time,
      reason: meetingData.reason,
      cancelledBy: meetingData.cancelledBy,
    };

    await this.sendEmail(emailData);
  }

  async getNotificationsForUser(userId: string): Promise<Notification[]> {
    try {
      const q = query(
        this.notificationsCollection,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const q = query(
        this.notificationsCollection,
        where('userId', '==', userId),
        where('read', '==', false)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }
}

export const notificationService = new NotificationService();
