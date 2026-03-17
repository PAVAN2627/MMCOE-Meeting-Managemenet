 /**
 * MeetSync Email Service - Simplified Version
 * Based on working HackMates pattern
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Route to appropriate email handler
    let result;
    switch (data.type) {
      case "welcome_email":
        result = sendWelcomeEmail(data);
        break;
      case "meeting_invitation":
        result = sendMeetingInvitation(data);
        break;
      case "task_assignment":
        result = sendTaskAssignment(data);
        break;
      default:
        return createResponse(false, "Invalid email type: " + data.type);
    }
    
    return createResponse(true, "Email sent successfully", result);
    
  } catch (error) {
    Logger.log("Error: " + error.toString());
    return createResponse(false, error.toString());
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: "active",
      service: "MeetSync Email Service",
      version: "1.0.0"
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

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
    .setMimeType(ContentService.MimeType.JSON);
}

function sendWelcomeEmail(data) {
  const { to, name, email, password, role, createdBy } = data;
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center;">
        <h1>🎉 Welcome to MeetSync!</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb;">
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your account has been created by <strong>${createdBy}</strong>.</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6;">
          <h2 style="color: #14b8a6; margin-top: 0;">Your Login Credentials</h2>
          <p><strong>👤 Name:</strong> ${name}</p>
          <p><strong>📧 Email:</strong> ${email}</p>
          <p><strong>🔑 Password:</strong> ${password}</p>
          <p><strong>👔 Role:</strong> ${role}</p>
        </div>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
          <strong>⚠️ Important:</strong>
          <ul>
            <li>Please change your password after first login</li>
            <li>Do not share your credentials</li>
          </ul>
        </div>
        
        <p style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px;">
          This is an automated message from MeetSync
        </p>
      </div>
    </div>
  `;
  
  MailApp.sendEmail({
    to: to,
    subject: "Welcome to MeetSync - Your Account Credentials",
    htmlBody: htmlBody,
    name: "MeetSync"
  });
  
  return { sent: true, recipient: to };
}

function sendMeetingInvitation(data) {
  const { to, meetingTitle, meetingDate, meetingTime, duration, description, organizerName } = data;
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center;">
        <h1>📅 Meeting Invitation</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb;">
        <p>You have been invited to a meeting by <strong>${organizerName}</strong>.</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6;">
          <h2 style="color: #1e3a8a; margin-top: 0;">${meetingTitle}</h2>
          ${description ? `<p>${description}</p>` : ''}
          <p><strong>📅 Date:</strong> ${meetingDate}</p>
          <p><strong>🕐 Time:</strong> ${meetingTime}</p>
          <p><strong>⏱️ Duration:</strong> ${duration} minutes</p>
        </div>
        
        <p>Please mark your calendar and join on time.</p>
        
        <p style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px;">
          This is an automated message from MeetSync
        </p>
      </div>
    </div>
  `;
  
  MailApp.sendEmail({
    to: to,
    subject: `Meeting Invitation: ${meetingTitle}`,
    htmlBody: htmlBody,
    name: "MeetSync"
  });
  
  return { sent: true, recipient: to };
}

function sendTaskAssignment(data) {
  const { to, taskTitle, taskDescription, dueDate, priority, assignedBy } = data;
  
  const priorityColors = {
    high: '#dc2626',
    medium: '#f59e0b',
    low: '#10b981'
  };
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center;">
        <h1>✅ New Task Assigned</h1>
      </div>
      <div style="padding: 30px; background: #f0fdfa;">
        <p>A new task has been assigned to you by <strong>${assignedBy}</strong>.</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6;">
          <h2 style="color: #14b8a6; margin-top: 0;">${taskTitle}</h2>
          <span style="background: ${priorityColors[priority]}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
            ${priority.toUpperCase()} PRIORITY
          </span>
          ${taskDescription ? `<p style="margin-top: 15px;">${taskDescription}</p>` : ''}
          ${dueDate ? `<p><strong>📅 Due Date:</strong> ${dueDate}</p>` : ''}
        </div>
        
        <p>Please log in to the system to view details and update the task status.</p>
        
        <p style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px;">
          This is an automated message from MeetSync
        </p>
      </div>
    </div>
  `;
  
  MailApp.sendEmail({
    to: to,
    subject: `New Task Assigned: ${taskTitle}`,
    htmlBody: htmlBody,
    name: "MeetSync"
  });
  
  return { sent: true, recipient: to };
}
