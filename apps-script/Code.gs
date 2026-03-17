/**
 * Meeting Management System - Email Service
 * Google Apps Script for sending notification emails
 * 
 * Deploy as Web App:
 * 1. Click "Deploy" > "New deployment"
 * 2. Select type: "Web app"
 * 3. Execute as: "Me"
 * 4. Who has access: "Anyone"
 * 5. Copy the Web App URL and add to your .env as VITE_EMAIL_SERVICE_URL
 */

/**
 * Handle POST requests from the application
 */
function doPost(e) {
  try {
    // Parse the incoming JSON data
    const data = JSON.parse(e.postData.contents);
    
    // Validate required fields
    if (!data.type || !data.to || !data.subject) {
      return createResponse(false, "Missing required fields: type, to, subject");
    }
    
    // Route to appropriate email handler
    let result;
    switch (data.type) {
      case "welcome_email":
        result = sendWelcomeEmail(data);
        break;
      case "meeting_invitation":
        result = sendMeetingInvitation(data);
        break;
      case "meeting_reminder":
        result = sendMeetingReminder(data);
        break;
      case "task_assignment":
        result = sendTaskAssignment(data);
        break;
      case "task_reminder":
        result = sendTaskReminder(data);
        break;
      case "mom_generated":
        result = sendMoMNotification(data);
        break;
      case "meeting_cancelled":
        result = sendMeetingCancellation(data);
        break;
      default:
        return createResponse(false, "Invalid email type: " + data.type);
    }
    
    return createResponse(true, "Email sent successfully", result);
    
  } catch (error) {
    Logger.log("Error in doPost: " + error.toString());
    return createResponse(false, "Error: " + error.toString());
  }
}

/**
 * Handle GET requests (for testing)
 */
function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({
      status: "active",
      service: "Meeting Management Email Service",
      version: "1.0.0"
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Send welcome email with credentials to new user
 */
function sendWelcomeEmail(data) {
  const { to, subject, name, email, password, role, createdBy, loginUrl } = data;
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .credentials-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6; }
        .credential-row { margin: 15px 0; padding: 10px; background: #f0fdfa; border-radius: 4px; }
        .label { font-weight: bold; color: #1e3a8a; display: block; margin-bottom: 5px; }
        .value { font-size: 16px; color: #333; font-family: monospace; background: white; padding: 8px; border-radius: 4px; display: inline-block; }
        .button { display: inline-block; background: #14b8a6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to MeetSync!</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${name}</strong>,</p>
          <p>Your account has been created by <strong>${createdBy}</strong>. Welcome to the Meeting Management System!</p>
          
          <div class="credentials-box">
            <h2 style="margin-top: 0; color: #14b8a6;">Your Login Credentials</h2>
            
            <div class="credential-row">
              <span class="label">👤 Full Name:</span>
              <span class="value">${name}</span>
            </div>
            
            <div class="credential-row">
              <span class="label">📧 Email / Username:</span>
              <span class="value">${email}</span>
            </div>
            
            <div class="credential-row">
              <span class="label">🔑 Password:</span>
              <span class="value">${password}</span>
            </div>
            
            <div class="credential-row">
              <span class="label">👔 Role:</span>
              <span class="value">${role}</span>
            </div>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important Security Notice:</strong>
            <ul style="margin: 10px 0;">
              <li>Please change your password after your first login</li>
              <li>Do not share your credentials with anyone</li>
              <li>Keep this email secure or delete it after changing your password</li>
            </ul>
          </div>
          
          <div style="text-align: center;">
            ${loginUrl ? `<a href="${loginUrl}" class="button">Login to MeetSync</a>` : ''}
          </div>
          
          <h3 style="color: #1e3a8a; margin-top: 30px;">What you can do:</h3>
          <ul>
            <li>📅 View and manage meetings</li>
            <li>✅ Track and update tasks</li>
            <li>📄 Access Minutes of Meeting documents</li>
            <li>🔔 Receive notifications and reminders</li>
          </ul>
          
          <p>If you have any questions or need assistance, please contact your administrator.</p>
          
          <div class="footer">
            <p>This is an automated message from MeetSync - Meeting Management System</p>
            <p>Please do not reply to this email</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  MailApp.sendEmail({
    to: to,
    subject: subject,
    htmlBody: htmlBody
  });
  
  return { sent: true, recipient: to };
}

/**
 * Send meeting invitation email
 */
function sendMeetingInvitation(data) {
  const { to, subject, meetingTitle, meetingDate, meetingTime, duration, location, description, organizerName } = data;
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .meeting-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6; }
        .detail-row { margin: 10px 0; }
        .label { font-weight: bold; color: #1e3a8a; }
        .button { display: inline-block; background: #14b8a6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📅 Meeting Invitation</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>You have been invited to a meeting by <strong>${organizerName}</strong>.</p>
          
          <div class="meeting-details">
            <h2 style="margin-top: 0; color: #1e3a8a;">${meetingTitle}</h2>
            ${description ? `<p>${description}</p>` : ''}
            
            <div class="detail-row">
              <span class="label">📅 Date:</span> ${meetingDate}
            </div>
            <div class="detail-row">
              <span class="label">🕐 Time:</span> ${meetingTime}
            </div>
            <div class="detail-row">
              <span class="label">⏱️ Duration:</span> ${duration} minutes
            </div>
            ${location ? `<div class="detail-row"><span class="label">📍 Location:</span> ${location}</div>` : ''}
          </div>
          
          <p>Please mark your calendar and join on time.</p>
          
          <div class="footer">
            <p>This is an automated message from MeetSync - Meeting Management System</p>
            <p>Please do not reply to this email</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  MailApp.sendEmail({
    to: to,
    subject: subject,
    htmlBody: htmlBody
  });
  
  return { sent: true, recipient: to };
}

/**
 * Send meeting reminder email
 */
function sendMeetingReminder(data) {
  const { to, subject, meetingTitle, meetingDate, meetingTime, minutesUntil } = data;
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #fffbeb; padding: 30px; border-radius: 0 0 8px 8px; }
        .reminder-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
        .urgent { font-size: 18px; font-weight: bold; color: #dc2626; text-align: center; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏰ Meeting Reminder</h1>
        </div>
        <div class="content">
          <div class="urgent">Meeting starts in ${minutesUntil} minutes!</div>
          
          <div class="reminder-box">
            <h2 style="margin-top: 0; color: #f59e0b;">${meetingTitle}</h2>
            <p><strong>📅 Date:</strong> ${meetingDate}</p>
            <p><strong>🕐 Time:</strong> ${meetingTime}</p>
          </div>
          
          <p style="text-align: center;">Please join the meeting on time.</p>
          
          <div class="footer">
            <p>This is an automated reminder from MeetSync</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  MailApp.sendEmail({
    to: to,
    subject: subject,
    htmlBody: htmlBody
  });
  
  return { sent: true, recipient: to };
}

/**
 * Send task assignment email
 */
function sendTaskAssignment(data) {
  const { to, subject, taskTitle, taskDescription, dueDate, priority, assignedBy } = data;
  
  const priorityColors = {
    high: '#dc2626',
    medium: '#f59e0b',
    low: '#10b981'
  };
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f0fdfa; padding: 30px; border-radius: 0 0 8px 8px; }
        .task-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6; }
        .priority { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; color: white; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ New Task Assigned</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>A new task has been assigned to you by <strong>${assignedBy}</strong>.</p>
          
          <div class="task-box">
            <h2 style="margin-top: 0; color: #14b8a6;">${taskTitle}</h2>
            <span class="priority" style="background: ${priorityColors[priority] || priorityColors.medium}">
              ${priority.toUpperCase()} PRIORITY
            </span>
            
            ${taskDescription ? `<p style="margin-top: 15px;">${taskDescription}</p>` : ''}
            
            ${dueDate ? `<p><strong>📅 Due Date:</strong> ${dueDate}</p>` : ''}
          </div>
          
          <p>Please log in to the system to view details and update the task status.</p>
          
          <div class="footer">
            <p>This is an automated message from MeetSync</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  MailApp.sendEmail({
    to: to,
    subject: subject,
    htmlBody: htmlBody
  });
  
  return { sent: true, recipient: to };
}

/**
 * Send task reminder email
 */
function sendTaskReminder(data) {
  const { to, subject, taskTitle, dueDate, daysUntilDue } = data;
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #fef2f2; padding: 30px; border-radius: 0 0 8px 8px; }
        .reminder-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
        .urgent { font-size: 18px; font-weight: bold; color: #dc2626; text-align: center; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Task Reminder</h1>
        </div>
        <div class="content">
          <div class="urgent">Task due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}!</div>
          
          <div class="reminder-box">
            <h2 style="margin-top: 0; color: #dc2626;">${taskTitle}</h2>
            <p><strong>📅 Due Date:</strong> ${dueDate}</p>
          </div>
          
          <p style="text-align: center;">Please complete this task before the deadline.</p>
          
          <div class="footer">
            <p>This is an automated reminder from MeetSync</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  MailApp.sendEmail({
    to: to,
    subject: subject,
    htmlBody: htmlBody
  });
  
  return { sent: true, recipient: to };
}

/**
 * Send MoM generated notification
 */
function sendMoMNotification(data) {
  const { to, subject, meetingTitle, meetingDate, momUrl } = data;
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #faf5ff; padding: 30px; border-radius: 0 0 8px 8px; }
        .mom-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed; }
        .button { display: inline-block; background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📄 Minutes of Meeting Available</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>The Minutes of Meeting (MoM) document has been generated and is now available.</p>
          
          <div class="mom-box">
            <h2 style="margin-top: 0; color: #7c3aed;">${meetingTitle}</h2>
            <p><strong>📅 Meeting Date:</strong> ${meetingDate}</p>
          </div>
          
          ${momUrl ? `<div style="text-align: center;"><a href="${momUrl}" class="button">Download MoM Document</a></div>` : ''}
          
          <p>Please review the document and provide feedback if needed.</p>
          
          <div class="footer">
            <p>This is an automated message from MeetSync</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  MailApp.sendEmail({
    to: to,
    subject: subject,
    htmlBody: htmlBody
  });
  
  return { sent: true, recipient: to };
}

/**
 * Send meeting cancellation email
 */
function sendMeetingCancellation(data) {
  const { to, subject, meetingTitle, meetingDate, meetingTime, reason, cancelledBy } = data;
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #fef2f2; padding: 30px; border-radius: 0 0 8px 8px; }
        .cancel-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>❌ Meeting Cancelled</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>The following meeting has been cancelled by <strong>${cancelledBy}</strong>.</p>
          
          <div class="cancel-box">
            <h2 style="margin-top: 0; color: #dc2626;">${meetingTitle}</h2>
            <p><strong>📅 Date:</strong> ${meetingDate}</p>
            <p><strong>🕐 Time:</strong> ${meetingTime}</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          </div>
          
          <p>You will be notified if the meeting is rescheduled.</p>
          
          <div class="footer">
            <p>This is an automated message from MeetSync</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  MailApp.sendEmail({
    to: to,
    subject: subject,
    htmlBody: htmlBody
  });
  
  return { sent: true, recipient: to };
}

/**
 * Create standardized response with CORS headers
 */
function createResponse(success, message, data) {
  const response = {
    success: success,
    message: message,
    timestamp: new Date().toISOString()
  };
  
  if (data) {
    response.data = data;
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('Access-Control-Max-Age', '86400');
}
