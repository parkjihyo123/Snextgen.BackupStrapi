const cron = require('node-cron');
const { BlobServiceClient } = require('@azure/storage-blob');
const archiver = require('archiver');
const stream = require('stream');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = process.env.AZURE_CONTAINER_NAME;
// console.log("Scheduler started...");

function getTimestampedFilename(folderName) {
    const date = new Date();
    const timestamp = date.toISOString().replace(/[:.]/g, '-'); // Format: YYYY-MM-DDTHH-MM-SS
    return `${folderName}-${timestamp}.zip`;
}
async function uploadFolderAsZip(folderPath, zipFileName) {
    if (!AZURE_STORAGE_CONNECTION_STRING || !CONTAINER_NAME) {
        throw new Error('Missing Azure storage configuration');
    }
    zipFileName = getTimestampedFilename(zipFileName);
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(zipFileName);
    // Create a pass-through stream
    const zipStream = new stream.PassThrough();
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(zipStream);
	
    // Add entire folder to zip
    const folderName = path.basename(folderPath);
    archive.directory(folderPath, folderName);

    // Start the upload process
    const uploadPromise = blockBlobClient.uploadStream(zipStream, undefined, undefined, {
        blobHTTPHeaders: { blobContentType: 'application/zip' }
    });

    // Finalize the archive (this triggers the upload)
    archive.finalize();

    await uploadPromise;
    console.log(`Folder "${folderPath}" zipped and uploaded as: ${zipFileName}`);
}
cron.schedule('* * * * *', () => {
	console.log('cron job started');
    uploadfolderaszip('public','public-storage').catch(err=> console.error("error while upload folder:", err));
});
