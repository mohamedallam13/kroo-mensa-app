(function (root, factory) {
  root.INSTAPAY = factory();
})(this, function () {

  const SCREENHOTS_FOLDER_ID = '1xJD-r9QLuSKMamIuSVtM8iyIanuSk7ls';

  /**
   * === 1. OCR: Get OCR result from image input ===
   */
  function getOcrResult(imageInput, options = {}) {
    try {
      let base64;
      // Detect input type
      if (typeof imageInput === 'string' && imageInput.match(/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/)) {
        base64 = imageInput;
      } else if (imageInput && typeof imageInput.getBytes === 'function') {
        base64 = Utilities.base64Encode(imageInput.getBytes());
      } else if (imageInput && imageInput.data && typeof imageInput.data === 'string') {
        base64 = imageInput.data;
      } else {
        throw new Error("Invalid image input: Must be a blob or base64 string");
      }

      const INSTAPAY_CLOUD_FUNCTION = PropertiesService.getScriptProperties().getProperty("instapayCloudFunction");
      const response = UrlFetchApp.fetch(INSTAPAY_CLOUD_FUNCTION, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify({ base64Image: base64 }),
        muteHttpExceptions: true
      });

      if (response.getResponseCode() >= 400) {
        return {
          success: false,
          error: "This doesn't appear to be a valid Instapay receipt. Please upload a screenshot of your payment."
        };
      }

      return JSON.parse(response.getContentText());
    } catch (e) {
      return {
        success: false,
        error: "This doesn't appear to be a valid Instapay receipt. Please upload a screenshot of your payment."
      };
    }
  }

  /**
   * === 2. Verification: Check OCR result for transaction validity ===
   */
  function getVerificationResult(ocrResult, options = {}) {
    // Default options
    const config = {
      // maxAgeMins: options.maxAgeMins || 10,
      maxAgeMins: 1000000,
      strictMetadataCheck: options.strictMetadataCheck || false,
      expectedAmount: options.expectedAmount,
      allowMoreThanExpected: options.allowMoreThanExpected !== false, // Default true
      checkReferenceUsage: !!options.checkReferenceUsage
    };

    // Initialize result
    const result = {
      isLegitimate: true,
      isRightAmount: true,
      amountStatus: "exact",
      remainder: 0,
      reasons: [],
      warnings: [],
      hasReferenceNumber: false,
      hasTimestamp: false,
      hasAmount: false,
      hasStatus: false,
      metadataTimestampUsed: false
    };

    if (!ocrResult.success || !ocrResult.receipt || !ocrResult.receipt.data) {
      result.isLegitimate = false;
      result.reasons.push("Invalid receipt format from OCR service");
      return result;
    }

    const receiptData = ocrResult.receipt.data;
    const confidence = ocrResult.receipt.confidence || {};

    // Status
    let statusFieldValue = null;
    if (receiptData.status) statusFieldValue = receiptData.status, result.hasStatus = true;
    else if (receiptData.transactionStatus) statusFieldValue = receiptData.transactionStatus, result.hasStatus = true;
    else if (receiptData.transactionStatusAlt) statusFieldValue = receiptData.transactionStatusAlt, result.hasStatus = true;

    if (!statusFieldValue) {
      result.isLegitimate = false;
      result.reasons.push("Missing transaction status field");
    } else {
      const statusText = statusFieldValue.toLowerCase();
      const successPatterns = [
        'successful', 'success', 'completed', 'approved',
        'تمت العملية بنجاح', 'تمت بنجاح', 'ناجحة', 'نجاح'
      ];
      const isSuccess = successPatterns.some(pattern => statusText.includes(pattern));
      if (!isSuccess) {
        result.isLegitimate = false;
        result.reasons.push(`Transaction status is not successful: ${statusFieldValue}`);
      }
    }

    // Timestamp
    let hasValidTimestamp = false, transactionDate = null;
    if (ocrResult.masterTimestamp && ocrResult.masterTimestamp.value) {
      try {
        transactionDate = new Date(ocrResult.masterTimestamp.value);
        if (!isNaN(transactionDate.getTime())) {
          hasValidTimestamp = true;
          result.hasTimestamp = true;
          result.metadataTimestampUsed = ocrResult.masterTimestamp.source && ocrResult.masterTimestamp.source.includes("exif");
        }
      } catch (e) { }
    }
    if (!hasValidTimestamp && receiptData.timestamp) {
      try {
        transactionDate = parseTransactionDate(receiptData.timestamp);
        if (!transactionDate || isNaN(transactionDate.getTime())) {
          result.warnings.push(`Could not parse transaction date: ${receiptData.timestamp}`);
        } else {
          hasValidTimestamp = true;
          result.hasTimestamp = true;
        }
      } catch (error) {
        result.warnings.push(`Error processing date: ${error.message}`);
      }
    }
    if (hasValidTimestamp) {
      const currentTime = new Date();
      const diffMs = currentTime - transactionDate;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins > config.maxAgeMins) {
        let timeAgoMessage;
        if (diffMins < 60) timeAgoMessage = `${diffMins} minutes`;
        else if (diffMins < 1440) timeAgoMessage = `${Math.floor(diffMins / 60)} hour(s)`;
        else timeAgoMessage = `${Math.floor(diffMins / 1440)} day(s)`;
        result.isLegitimate = false;
        result.reasons.push(`Transaction is too old (${timeAgoMessage} ago, max allowed: ${config.maxAgeMins} minutes)`);
      }
      if (transactionDate > currentTime) {
        result.isLegitimate = false;
        result.reasons.push(`Transaction date is in the future: ${transactionDate.toISOString()}`);
      }
    } else if (!result.hasTimestamp) {
      result.isLegitimate = false;
      result.reasons.push("No valid transaction timestamp found");
    }

    // Metadata check
    if (config.strictMetadataCheck && (!ocrResult.metadata ||
      (!ocrResult.metadata.DateTimeOriginal && !ocrResult.metadata.CreateDate))) {
      result.isLegitimate = false;
      result.reasons.push("Missing required metadata (possible manipulation)");
    } else if (!ocrResult.metadata) {
      result.warnings.push("Missing metadata (possible manipulation but allowed by config)");
    }

    // Confidence
    const lowConfidenceThreshold = 0.80;
    for (const field in confidence) {
      if (confidence[field] < lowConfidenceThreshold) {
        result.warnings.push(`Low confidence in ${field}: ${confidence[field]}`);
      }
    }

    // Reference number
    if (!receiptData.reference) {
      result.isLegitimate = false;
      result.reasons.push("Missing required reference number field");
      result.hasReferenceNumber = false;
    } else {
      result.hasReferenceNumber = true;
      if (receiptData.reference.length < 8) {
        result.warnings.push(`Reference number seems too short: ${receiptData.reference}`);
      }

      // Duplicate reference check (if enabled)
      if (config.checkReferenceUsage) {
        // Placeholder: replace with your real loader as needed
        var referenceStore = loadReferenceStore(); // <-- returns an array of references
        if (Array.isArray(referenceStore)) {
          if (referenceStore.includes(receiptData.reference)) {
            result.isLegitimate = false;
            result.reasons.push("Reference number already used");
          }
        } else {
          // Optionally: warning/log that reference store could not be loaded
          result.warnings.push("Reference store could not be loaded for duplicate check");
        }
      }

    }

    // Amount
    if (!receiptData.amount) {
      result.isLegitimate = false;
      result.reasons.push("Missing required amount field");
      result.hasAmount = false;
    } else {
      result.hasAmount = true;
      const amount = parseFloat(receiptData.amount);
      if (isNaN(amount) || amount <= 0) {
        result.isLegitimate = false;
        result.amountStatus = "invalid";
        result.reasons.push(`Invalid transaction amount: ${receiptData.amount}`);
      }
      if (config.expectedAmount !== undefined && config.expectedAmount !== null) {
        let expectedAmount = config.expectedAmount;
        if (typeof expectedAmount === "string") {
          expectedAmount = expectedAmount.replace(/,/g, '').replace(/\s/g, '');
        }
        expectedAmount = parseFloat(expectedAmount);
        if (!isNaN(expectedAmount) && expectedAmount > 0) {
          result.remainder = amount - expectedAmount;
          if (amount === expectedAmount) {
            result.amountStatus = "exact";
          } else if (amount > expectedAmount) {
            result.amountStatus = "more";
            if (!config.allowMoreThanExpected) {
              result.isRightAmount = false;
              result.reasons.push(`Amount is more than expected: ${amount} vs ${expectedAmount} (excess: ${result.remainder})`);
            } else {
              result.warnings.push(`Amount is more than expected: ${amount} vs ${expectedAmount} (excess: ${result.remainder})`);
            }
          } else {
            result.amountStatus = "less";
            result.isRightAmount = false;
            result.reasons.push(`Amount is less than expected: ${amount} vs ${expectedAmount} (shortfall: ${Math.abs(result.remainder)})`);
          }
          if (!result.isRightAmount) result.isLegitimate = false;
        }
      }
    }

    return result;
  }

  /**
  * === 3. Decision: Get payment approval/rejection based on verification ===
  * Improved to better prioritize issues and handle partial payments
  */
  function getPaymentDecision(verificationResult, ocrResult, options = {}) {
    const decision = {
      decision: "REJECTED",
      primaryCode: 0,
      message: "",
      codes: []
    };

    // OCR error
    if (ocrResult && ocrResult.success === false) {
      decision.decision = "ERROR";
      decision.primaryCode = 7;
      decision.codes = [7];
      decision.message = "We couldn't process this receipt. Please upload a clearer image of your InstaPay receipt.";
      return decision;
    }

    // Collect all issues
    const issuesCodes = [];

    // Unsuccessful transaction (highest priority issue)
    if (verificationResult.hasStatus && verificationResult.reasons.some(r => r.includes("not successful") || r.includes("status is not"))) {
      issuesCodes.push(1);
    }

    // Missing status
    if (!verificationResult.hasStatus) issuesCodes.push(2);

    // No reference number - critical issue
    if (!verificationResult.hasReferenceNumber) issuesCodes.push(5);

    // Time-related issues - very important
    const hasMissingTimestamp = !verificationResult.hasTimestamp;
    const hasOldTimestamp = verificationResult.reasons.some(r => r.includes("too old"));

    if (hasMissingTimestamp) issuesCodes.push(3);
    if (hasOldTimestamp) issuesCodes.push(4);

    // Amount issues - less critical if above are fine
    const isPartialPayment = !verificationResult.isRightAmount &&
      verificationResult.amountStatus === 'less' &&
      Math.abs(verificationResult.remainder) < options.expectedAmount; // Not a complete miss

    const isOverpayment = !verificationResult.isRightAmount &&
      verificationResult.amountStatus === 'more';

    if (!verificationResult.isRightAmount && !isPartialPayment && !isOverpayment) {
      issuesCodes.push(6); // Regular amount issue
    }

    // Special handling for partial payments
    if (isPartialPayment && !issuesCodes.includes(1) &&
      !issuesCodes.includes(2) && !issuesCodes.includes(3) &&
      !issuesCodes.includes(4) && !issuesCodes.includes(5)) {
      // If the ONLY issue is partial payment and everything else is okay
      decision.decision = "PARTIAL";
      decision.primaryCode = 9; // New code for partial payments
      decision.codes = [9];
      const shortfall = Math.abs(verificationResult.remainder).toFixed(2);
      decision.message = `Partial payment detected. The amount is ${shortfall} less than required.`;
      return decision;
    }

    // Special handling for overpayments
    if (isOverpayment && !issuesCodes.includes(1) &&
      !issuesCodes.includes(2) && !issuesCodes.includes(3) &&
      !issuesCodes.includes(4) && !issuesCodes.includes(5)) {
      // If the ONLY issue is overpayment and everything else is okay
      decision.decision = "APPROVED";
      decision.primaryCode = 10; // New code for overpayments
      decision.codes = [10];
      const excess = verificationResult.remainder.toFixed(2);
      decision.message = `Payment verified successfully. You paid ${excess} more than required.`;
      return decision;
    }

    // Determine primary issue based on PRIORITY not numeric order
    // This is a key change from the original code
    if (issuesCodes.length > 0) {
      // Define priority order (most important first)
      const priorityOrder = [1, 5, 3, 4, 2, 6];

      // Sort issues by priority
      issuesCodes.sort((a, b) => {
        return priorityOrder.indexOf(a) - priorityOrder.indexOf(b);
      });

      decision.primaryCode = issuesCodes[0];
      decision.codes = issuesCodes;
      decision.message = generateHumanReadableMessage(issuesCodes, verificationResult);
    } else {
      decision.decision = "APPROVED";
      decision.primaryCode = 8;
      decision.message = "Payment verified successfully.";
    }

    // Set final decision status based on primary code
    if (decision.primaryCode === 8 || decision.primaryCode === 10) {
      decision.decision = "APPROVED";
    } else if (decision.primaryCode === 9) {
      decision.decision = "PARTIAL";
    } else if (decision.primaryCode === 7) {
      decision.decision = "ERROR";
    } else {
      decision.decision = "REJECTED";
    }

    return decision;
  }

  /**
   * === 4. One-call frontend function: Does all three stages and returns combined result as stringified JSON ===
   */
  function processFullVerification(imageInput, options = {}) {
    let savedFileId = null;
    if (imageInput && typeof imageInput.getBytes === 'function') {
      // Save the screenshot to Drive
      var fileName = options && options.reference ? `instapay_${options.reference}.jpg` : `instapay_${Date.now()}.jpg`;
      savedFileId = saveScreenshotToDrive(imageInput, fileName);
      if (options) options.savedFileId = savedFileId;
    }
    const ocrResult = getOcrResult(imageInput, options);
    const verificationResult = getVerificationResult(ocrResult, options);
    const decision = getPaymentDecision(verificationResult, ocrResult, options);
    const imageURL =" https://lh3.googleusercontent.com/d/" + savedFileId
    // Include the saved file ID in the result
    return JSON.stringify({ ocrResult, verificationResult, decision, savedFileId, imageURL });
  }

  /**
   * === 5. Helpers (internal only) ===
   */


  /**
   * Improved message generation for better clarity and UX
   */
  function generateHumanReadableMessage(issues, verification) {
    if (issues.length === 0) return "Payment verified successfully.";
    if (issues.includes(7)) return "We couldn't process this receipt. Please upload a clearer image of your InstaPay receipt.";
    if (issues.includes(1)) return "This payment was not successful. Please complete the payment and upload a successful transaction receipt.";

    // Special handling for time-related issues - prioritize these
    const hasOldTimestamp = verification.reasons.find(r => r.includes("too old"));
    if (issues.includes(4) && hasOldTimestamp) {
      // Extract the time from the reason for better messaging
      const match = hasOldTimestamp.match(/\(([^)]+)\)/);
      const timeInfo = match && match[1] ? match[1] : "too old";
      return `We couldn't verify your payment. The transaction is from ${timeInfo}, which exceeds our verification window.`;
    }

    if (issues.includes(3)) {
      return "We couldn't verify your payment. The transaction date is missing from the receipt.";
    }

    // Reference number is critical
    if (issues.includes(5)) {
      return "We couldn't verify your payment. The reference number is missing from the receipt.";
    }

    // Status issues
    if (issues.includes(2)) {
      return "We couldn't verify your payment. The transaction status is unclear or missing.";
    }

    // Amount issues - handled last
    if (issues.includes(6)) {
      if (verification.amountStatus === "less") {
        const shortfall = Math.abs(verification.remainder).toFixed(2);
        return `We couldn't verify your payment. The amount is ${shortfall} less than required.`;
      } else if (verification.amountStatus === "more") {
        const excess = verification.remainder.toFixed(2);
        return `The amount is ${excess} more than required, but your booking can be confirmed.`;
      } else {
        return "We couldn't verify your payment. The amount is invalid or unreadable.";
      }
    }

    // Fall back to collecting all issues if none of the specific handlers matched
    const issuesDescriptions = [];
    if (issues.includes(2)) issuesDescriptions.push("transaction status is unclear");
    if (issues.includes(5)) issuesDescriptions.push("reference number is missing");
    if (issues.includes(3)) issuesDescriptions.push("transaction date is missing");

    if (issues.includes(4)) {
      let timeAgoMessage = "it's too old";
      const oldTimestampReason = verification.reasons.find(r => r.includes("too old"));
      if (oldTimestampReason) {
        const match = oldTimestampReason.match(/\(([^)]+)\)/);
        if (match && match[1]) timeAgoMessage = `it's from ${match[1]}`;
      }
      issuesDescriptions.push(timeAgoMessage);
    }

    if (issues.includes(6)) {
      if (verification.amountStatus === "less") {
        const shortfall = Math.abs(verification.remainder).toFixed(2);
        issuesDescriptions.push(`amount is ${shortfall} less than required`);
      } else if (verification.amountStatus === "more") {
        const excess = verification.remainder.toFixed(2);
        issuesDescriptions.push(`amount is ${excess} more than required`);
      } else {
        issuesDescriptions.push("amount is invalid");
      }
    }

    if (issuesDescriptions.length === 1) {
      return `We couldn't verify your payment. The ${issuesDescriptions[0]}.`;
    } else if (issuesDescriptions.length === 2) {
      return `We couldn't verify your payment. The ${issuesDescriptions[0]} and ${issuesDescriptions[1]}.`;
    } else {
      const lastIssue = issuesDescriptions.pop();
      return `We couldn't verify your payment. The ${issuesDescriptions.join(', ')}, and ${lastIssue}.`;
    }
  }

  function parseTransactionDate(dateStr) {
    if (!dateStr) return null;
    let date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;
    const engDateRegex = /(\d{1,2})\s+(\w+)\s+(\d{4})\s+(\d{1,2}):(\d{1,2})\s+(\w{2})/i;
    const engMatch = dateStr.match(engDateRegex);
    if (engMatch) {
      const months = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
      };
      const day = parseInt(engMatch[1]);
      const monthStr = engMatch[2].toLowerCase().substring(0, 3);
      const month = months[monthStr];
      const year = parseInt(engMatch[3]);
      let hours = parseInt(engMatch[4]);
      const minutes = parseInt(engMatch[5]);
      const ampm = engMatch[6].toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      if (month !== undefined) return new Date(year, month, day, hours, minutes);
    }
    const shortDateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const shortMatch = dateStr.match(shortDateRegex);
    if (shortMatch) {
      const day = parseInt(shortMatch[1]);
      const month = parseInt(shortMatch[2]) - 1;
      const year = parseInt(shortMatch[3]);
      if (day > 0 && day <= 31 && month >= 0 && month <= 11) return new Date(year, month, day);
      const altDay = parseInt(shortMatch[2]);
      const altMonth = parseInt(shortMatch[1]) - 1;
      if (altDay > 0 && altDay <= 31 && altMonth >= 0 && altMonth <= 11) return new Date(year, altMonth, altDay);
    }
    if (/[\u0600-\u06FF]/.test(dateStr)) return null;
    return null;
  }

  function saveScreenshotToDrive(blob, fileName) {
    try {
      var folder = DriveApp.getFolderById(SCREENHOTS_FOLDER_ID);
      var file = folder.createFile(blob);
      file.setName(fileName);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return file.getId();
    } catch (e) {
      Logger.log('Error saving screenshot to Drive: ' + e);
      return null;
    }
  }

  /**
   * === 6. Test functions (exposed for dev/testing only) ===
   */
  function testAllStagesWithSample() {
    const sampleReceipt = {
      "success": true,
      "receipt": {
        "data": {
          "timestamp": "16 May 2025 10:56 PM",
          "reference": "513601082638",
          "amount": "200.00",
          "currency": "EGP",
          "senderName": "ninabobina@instapay",
          "senderFullName": "ESRAA SAMIR MOHAMED YOUSEF MOH",
          "receiverName": "MOHAMED H***** A*** A** A****",
          "receiverID": "cairoconfessions@instapay",
          "status": "Transaction Successful",
          "note": "Living Expenses",
          "transferTitle": "Transfer Amount"
        },
        "confidence": {
          "timestamp": 0.97,
          "reference": 0.99,
          "amount": 0.99,
          "currency": 1.0,
          "senderName": 0.95,
          "senderFullName": 0.94,
          "receiverName": 0.95,
          "receiverID": 0.98,
          "status": 0.99,
          "note": 0.92
        },
        "hasTimestamp": true,
        "hasReference": true
      },
      "masterTimestamp": {
        "value": "2025-05-16T22:56:00",
        "source": "receipt"
      },
      "metadata": {
        "DateTimeOriginal": "2025-05-16T22:58:23",
        "CreateDate": "2025-05-16T22:58:23",
        "ModifyDate": "2025-05-16T22:58:23",
        "Software": "iPhone 15",
        "ImageWidth": 1170,
        "ImageHeight": 2532,
        "Make": "Apple",
        "Model": "iPhone 15"
      }
    };
    // Simulate the chain
    const ocrResult = sampleReceipt;
    const verification = getVerificationResult(ocrResult, { expectedAmount: 200 });
    const decision = getPaymentDecision(verification, ocrResult);
    return JSON.stringify({ ocrResult, verification, decision }, null, 2);
  }

  function testWithImages(fileIds, options = {}) {
    Logger.log("=== TESTING WITH REAL IMAGES ===");
    if (!fileIds || !fileIds.length) {
      Logger.log("No file IDs provided for testing");
      return "No files to test. Please provide file IDs.";
    }
    fileIds.forEach((fileId, index) => {
      try {
        Logger.log(`\n--- Testing file ${index + 1}: ${fileId} ---`);
        const file = DriveApp.getFileById(fileId);
        const fileName = file.getName();
        const fileBlob = file.getBlob();
        Logger.log(`File name: ${fileName}`);
        const resultStr = processFullVerification(fileBlob, { expectedAmount: 200 });
        Logger.log(`Result: ${resultStr}`);
      } catch (error) {
        Logger.log(`Error processing file ${fileId}: ${error}`);
      }
    });
    return "Test complete. Check logs for results.";
  }

  // === PUBLIC API ===
  return {
    getOcrResult,
    getVerificationResult,
    getPaymentDecision,
    processFullVerification,
    testAllStagesWithSample,
    testWithImages
  };
});

/**
 * Main function to verify Instapay payments
 * @param {Object} dataObj - Object containing fileContent and verification options
 * @returns {String} JSON string with verification result
 */
function processFullVerification(dataObj) {
  const imageBlob = dataObj.fileContent;
  Logger.log(dataObj);
  return INSTAPAY.processFullVerification(imageBlob, dataObj);
}

/**
 * Simple test function that can be run from the script editor
 */
function testAllStagesWithSample() {
  return INSTAPAY.testAllStagesWithSample();
}

/**
 * Test with real receipt images from Drive
 * Just add the file IDs of your test receipts
 */
function testWithImages() {
  // Replace these with your actual test file IDs
  const fileIds = [
    "1JVdbdquvWx-UHSdE1mVcyS2t5ZH3UuGo",
    "1QIK9IWnY6R2WvsqLDdFnRQhNCAVptuOZ",
    "1JIxn08SNJsZN4gqc6ORJF2XS7rQdrGqr",
    "1nqKkQQcOm6bmYSJ-upyyiAemWtkMqoNq",
    "1VPPQKPIRql-sx_4mWjjBkHlmZ8aFiQDN"
  ];

  return INSTAPAY.testWithImages(fileIds);
}

