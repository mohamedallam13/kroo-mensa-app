(function (root, factory) {
  root.EMAIL_CODE_SENDING = factory();
})(this, function () {
  // === KROO Café Login Code Email Module ===

  // Set to true to send to real users, false to send to testEmail
  const LIVE = false;
  const testEmail = 'mohamedallam.tu@gmail.com';

  /**
   * Send a login code to the user's email address
   * @param {string} email - The user's email address
   * @param {string|number} code - The login code to send
   */
  function sendLoginCode(email, code) {
    const subject = 'Your KROO Café Login Code';
    const htmlBody = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8fafc; color: #1e293b; padding: 32px; border-radius: 12px; max-width: 420px; margin: 0 auto;">
        <div style="text-align: center;">
          <img src="https://lh3.googleusercontent.com/d/1JDO6dqyJ8U6hrIuzDk31VibFtIIs5Pd_" alt="KROO Café" width="80" style="margin-bottom: 16px;" />
          <h2 style="color: #f59e0b; margin-bottom: 8px;">Login Confirmation</h2>
          <p style="font-size: 1.1rem; color: #64748b; margin-bottom: 24px;">Use the code below to log in to your KROO Café account:</p>
          <div style="font-size: 2.2rem; font-weight: bold; letter-spacing: 0.2em; color: #1e293b; background: #fffbe6; border: 2px dashed #f59e0b; border-radius: 8px; padding: 18px 0; margin-bottom: 24px;">${code}</div>
          <p style="color: #64748b; font-size: 0.95rem;">This code is valid for a short time. If you did not request this, you can ignore this email.</p>
        </div>
        <div style="margin-top: 32px; text-align: center; color: #94a3b8; font-size: 0.85rem;">KROO Café &copy; 2025</div>
      </div>
    `;
    try {
      const recipient = LIVE ? email : testEmail;
      MailApp.sendEmail({
        to: recipient,
        subject: subject,
        htmlBody: htmlBody,
        noReply: true,
        name: 'KROO Café'
      });
      console.log(`Login code email sent to ${recipient}`);
      if (!LIVE) {
        console.log(`Test mode: Original recipient would have been ${email}`);
      }
    } catch (error) {
      console.error('Error sending login code email:', error);
      throw new Error('Failed to send login code email');
    }
  }

  /**
   * Test function: sends a test login code email to testEmail
   */
  function sendTestLoginCode() {
    sendLoginCode(testEmail, '123456');
  }

  // Export only the login code sender and test function
  return {
    sendLoginCode,
    sendTestLoginCode
  };
});

function sendLoginCode(email, code){
  EMAIL_CODE_SENDING.sendLoginCode(email, code)
}

function sendTestLoginCode(){
  EMAIL_CODE_SENDING.sendTestLoginCode()
}