const functions = require('firebase-functions');
const admin = require('firebase-admin');
const spawn = require('child-process-promise').spawn;
const path = require('path');
const os = require('os');
const fs = require('fs');

var serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://learnfirebase-f5370.firebaseio.com"
});

exports.onFinalize = functions.storage.object().onFinalize(async (object) => {

  const fileBucket = object.bucket; // The Storage bucket that contains the file.
  const bucketFilePath = object.name; // File path in the bucket.
  const contentType = object.contentType; // File content type.
  const metadata = object.metadata;

  if (!contentType.startsWith('image/')) {
    return console.log('This is not an image.');
  }

  const fileName = path.basename(bucketFilePath);

  if(!metadata || fileName.startsWith('thumb_')) {
    return console.log('Image is already processed');
  }

  const bucket = admin.storage().bucket(fileBucket);
  const localFilePath = path.join(os.tmpdir(), fileName);
  const localThumbPath = path.join(os.tmpdir(), `thumb_${fileName}`);

  await bucket.file(bucketFilePath).download({destination: localFilePath});
  
  await spawn('convert', [localFilePath, '-thumbnail', '400x400>', localThumbPath]);
  await spawn('convert', [localFilePath, '-auto-orient', '-gravity', 'center', '-pointsize', '130', '-fill', 'rgba(240, 237, 234, 0.3)', '-draw', 'text 0,-300 "jojo_studio"', localFilePath]);
  
  const thumbFilePath = path.join(path.dirname(bucketFilePath), `thumb_${fileName}`);

  const [file] = await bucket.upload(localFilePath, { destination: bucketFilePath });
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: '03-09-2491'
  });

  const [thumbFile] = await bucket.upload(localThumbPath, { destination: thumbFilePath });
  const [thumb_url] = await thumbFile.getSignedUrl({
    action: 'read',
    expires: '03-09-2491'
  });

  const [key] = bucketFilePath.split('.');
  await admin.database().ref(key).set({ file_name: fileName, url, thumb_url, selected: false })
  
  fs.unlinkSync(localThumbPath);
  return fs.unlinkSync(localFilePath);
});