/**
 * MeetSync Email Service - Exact HackMates Version
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    MailApp.sendEmail({
      to: data.email,  // HackMates uses 'email' not 'to'
      subject: data.subject,
      htmlBody: data.html || undefined,
      body: data.message || undefined,
      name: "MeetSync"
    });
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log("Error: " + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput("MeetSync Email Service Active")
    .setMimeType(ContentService.MimeType.TEXT);
}
