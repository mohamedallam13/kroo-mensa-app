(function (root, factory) {
  root.HELPERS = factory();
})(this, function () {
  function getGDriveImgById(id) {
    return `https://drive.google.com/uc?export=view&id=${id}`;
  }

  function getGDriveImgByLink(link) {
    const [, idSide] = link.split("d/");
    const [id] = idSide.split("/");
    return getGDriveImgById(id);
  }

  function getFavIconFromId(id) {
    return `https://drive.google.com/uc?id=${id}&export=download&format=png`;
  }

  function getFavIconFromLink(link) {
    const [, idSide] = link.split("d/");
    const [id] = idSide.split("/");
    return getFavIconFromId(id);
  }

  function getWhatsappLink(number) {
    return `https://wa.me/${number}`;
  }

  function getEmailLink(email) {
    return `mailto:${email}`;
  }

  function convertImageToDataUri(link) {
    const [, idSide] = link.split("d/");
    const [fileId] = idSide.split("/");
    // var fileId = 'YOUR_FILE_ID_HERE'; // Replace with your Google Drive file ID
    var file = DriveApp.getFileById(fileId);
    var blob = file.getBlob();
    var contentType = blob.getContentType();
    var base64Data = Utilities.base64Encode(blob.getBytes());
    var dataUri = 'data:' + contentType + ';base64,' + base64Data;
    console.log(dataUri)
    return dataUri
    // You can now use this data URI as needed in your application
  }

  function convertDriveUrlToDirectImageUrl(driveUrl) {
    // Regular expression to extract the file ID from various Google Drive URL formats
    const regex = /\/d\/([a-zA-Z0-9_-]+)\/|id=([a-zA-Z0-9_-]+)/;
    const match = driveUrl.match(regex);

    // Extract the file ID from the match group (either the first or second capturing group)
    const fileId = match ? (match[1] || match[2]) : null;

    if (!fileId) {
      throw new Error('Could not extract file ID from the provided Google Drive URL');
    }

    // Return the direct image URL using the lh3.googleusercontent.com format
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  /**
   * Encode parameters to a simple hash
   */
  function encodeParams(email, name = '', discount = 0, admin = false) {
    const params = {
      email: email,
      name: name,
      discount: discount,
      admin: admin
    };

    const jsonString = JSON.stringify(params);
    return Utilities.base64Encode(jsonString);
  }

  /**
   * Decode hash back to parameters
   */
  function decodeParams(hash) {
    try {
      if (!hash) return null;

      const jsonString = Utilities.base64Decode(hash, Utilities.Charset.UTF_8);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Error decoding hash:', error);
      return null;
    }
  }

  /**
   * Generate a link with hash parameter
   */
  function generateLink(email, name = '', discount = 0, admin = false) {
    const hash = encodeParams(email, name, discount, admin);
    const baseUrl = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

    return `${baseUrl}?h=${encodeURIComponent(hash)}`;
  }


  return {
    getFavIconFromLink,
    getGDriveImgById,
    getGDriveImgByLink,
    convertImageToDataUri,
    getWhatsappLink,
    getEmailLink,
    convertDriveUrlToDirectImageUrl,
    encodeParams,
    decodeParams,
    generateLink
  };
});
