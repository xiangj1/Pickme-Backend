// [START import]
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp()
const spawn = require('child-process-promise').spawn;
const path = require('path');
const os = require('os');
const fs = require('fs');
// [END import]

// [START generateThumbnail]
/**
 * When an image is uploaded in the Storage bucket We generate a thumbnail automatically using
 * ImageMagick.
 */
// [START generateThumbnailTrigger]
exports.onFinalize = functions.storage.object().onFinalize(async (object) => {

  const fileBucket = object.bucket; // The Storage bucket that contains the file.
  const filePath = object.name; // File path in the bucket.
  const contentType = object.contentType; // File content type.
  const metadata = object.metadata;

  if (!contentType.startsWith('image/')) {
    return console.log('This is not an image.');
  }

  const fileName = path.basename(filePath);

  if(!metadata) {
    return console.log('Image is already processed');
  }

  const bucket = admin.storage().bucket(fileBucket);
  const tempFilePath = path.join(os.tmpdir(), fileName);
  console.log('tempFilePath',tempFilePath);

  await bucket.file(filePath).download({destination: tempFilePath});
  
  await spawn('convert', [tempFilePath, '-auto-orient', '-gravity', 'center', '-pointsize', '130', '-fill', 'rgba(140, 114, 127, 0.2)', '-draw', 'text 0,0 "jojo_studio"', tempFilePath]);
  
  const thumbFileName = `${fileName}`;
  const thumbFilePath = path.join(path.dirname(filePath), thumbFileName);
  console.log('thumb file path', thumbFilePath);
  await bucket.upload(tempFilePath, {
    destination: thumbFilePath,
  });
  
  return fs.unlinkSync(tempFilePath);
});