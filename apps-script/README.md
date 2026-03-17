# Google Apps Script Email Service

This Google Apps Script handles all email notifications for the Meeting Management System.

## Setup Instructions

### 1. Create a New Apps Script Project

1. Go to [Google Apps Script](https://script.google.com/)
2. Click "New Project"
3. Name it "MeetSync Email Service"

### 2. Add the Code

1. Delete the default `myFunction()` code
2. Copy all content from `Code.gs` and paste it into the script editor
3. Save the project (Ctrl+S or Cmd+S)

### 3. Deploy as Web App

1. Click "Deploy" button (top right)
2. Select "New deployment"
3. Click the gear icon ⚙️ next to "Select type"
4. Choose "Web app"
5. Configure deployment:
   - **Description**: "Email Service v1"
   - **Execute as**: "Me" (your Google account)
   - **Who has access**: "Anyone"
6. Click "Deploy"
7. Review permissions and click "Authorize access"
8. Select your Google account
9. Click "Advanced" → "Go to MeetSync Email Service (unsafe)"
10. Click "Allow"
11. Copy the **Web App URL** (it will look like: `https://script.google.com/macros/s/...../exec`)

### 4. Add URL to Your Application

1. Open your `.env` file
2. Add the Web App URL:
   ```
   VITE_EMAIL_SERVICE_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   ```

### 5. Test the Service

Test with a simple GET request:
```bash
curl https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

You should receive:
```json
{
  "status": "active",
  "service": "Meeting Management Email Service",
  "version": "1.0.0"
}
```

## Supported Email Types

### 1. Meeting Invitation
```javascript
{
  "type": "meeting_invitation",
  "to": "user@example.com",
  "subject": "Meeting Invitation: Team Sync",
  "meetingTitle": "Weekly Team Sync",
  "meetingDate": "March 5, 2026",
  "meetingTime": "2:00 PM",
  "duration": "60",
  "location": "Conference Room A",
  "description": "Discuss project updates",
  "organizerName": "John Doe"
}
```

### 2. Meeting Reminder
```javascript
{
  "type": "meeting_reminder",
  "to": "user@example.com",
  "subject": "Reminder: Meeting in 30 minutes",
  "meetingTitle": "Weekly Team Sync",
  "meetingDate": "March 5, 2026",
  "meetingTime": "2:00 PM",
  "minutesUntil": "30"
}
```

### 3. Task Assignment
```javascript
{
  "type": "task_assignment",
  "to": "user@example.com",
  "subject": "New Task Assigned: Prepare Report",
  "taskTitle": "Prepare Quarterly Report",
  "taskDescription": "Compile Q1 data and create presentation",
  "dueDate": "March 10, 2026",
  "priority": "high",
  "assignedBy": "Jane Smith"
}
```

### 4. Task Reminder
```javascript
{
  "type": "task_reminder",
  "to": "user@example.com",
  "subject": "Task Due Soon: Prepare Report",
  "taskTitle": "Prepare Quarterly Report",
  "dueDate": "March 10, 2026",
  "daysUntilDue": "2"
}
```

### 5. MoM Generated
```javascript
{
  "type": "mom_generated",
  "to": "user@example.com",
  "subject": "Minutes of Meeting Available",
  "meetingTitle": "Weekly Team Sync",
  "meetingDate": "March 5, 2026",
  "momUrl": "https://example.com/mom/document.docx"
}
```

### 6. Meeting Cancelled
```javascript
{
  "type": "meeting_cancelled",
  "to": "user@example.com",
  "subject": "Meeting Cancelled: Team Sync",
  "meetingTitle": "Weekly Team Sync",
  "meetingDate": "March 5, 2026",
  "meetingTime": "2:00 PM",
  "reason": "Organizer unavailable",
  "cancelledBy": "John Doe"
}
```

## Usage from Your Application

```typescript
import { notificationService } from '@/services/notification.service';

// Send meeting invitation
await notificationService.sendMeetingInvitation(
  'user@example.com',
  meetingData
);

// Send task assignment
await notificationService.sendTaskAssignment(
  'user@example.com',
  taskData
);
```

## Updating the Deployment

When you make changes to the code:

1. Save the changes in the script editor
2. Click "Deploy" → "Manage deployments"
3. Click the edit icon (pencil) next to your deployment
4. Change "Version" to "New version"
5. Click "Deploy"

The Web App URL remains the same, so you don't need to update your `.env` file.

## Troubleshooting

### Emails Not Sending

1. Check that the Web App URL is correct in `.env`
2. Verify the deployment is set to "Anyone" access
3. Check the Apps Script execution logs:
   - Open your script
   - Click "Executions" in the left sidebar
   - Look for errors

### Permission Issues

If you see "Authorization required":
1. Re-deploy the web app
2. Go through the authorization flow again
3. Make sure you're using the same Google account

### Testing Individual Functions

You can test functions directly in the Apps Script editor:
1. Select a function from the dropdown (e.g., `sendMeetingInvitation`)
2. Click "Run"
3. Check the logs for output

## Email Sending Limits

Google Apps Script has daily email quotas:
- **Free Gmail accounts**: 100 emails/day
- **Google Workspace accounts**: 1,500 emails/day

For production use with high volume, consider:
- Using a dedicated Google Workspace account
- Implementing email batching
- Using a professional email service (SendGrid, AWS SES, etc.)

## Security Notes

- The script runs under your Google account
- Only send emails to verified institutional addresses
- Never expose the Web App URL publicly
- Store it securely in environment variables
- Consider adding authentication tokens for production use
