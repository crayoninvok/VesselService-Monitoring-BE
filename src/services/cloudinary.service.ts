// src/services/cloudinary.service.ts
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

class CloudinaryService {
  /**
   * Upload a single vessel image to Cloudinary
   * @param file The file to upload
   * @param id The vessel ID
   * @returns The URL of the uploaded image
   */
  async uploadVesselImage(file: Express.Multer.File, id: string): Promise<string> {
    try {
      // Create a readable stream from the buffer
      const stream = new Readable();
      stream.push(file.buffer);
      stream.push(null);

      // Create upload stream
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'vessels_image',
            public_id: `vessel_${id}_${Date.now()}`,
            resource_type: 'image',
            format: file.originalname.split('.').pop()?.toLowerCase() || 'jpg',
            overwrite: true
          },
          (error, result) => {
            if (error) return reject(error);
            return resolve(result!.secure_url);
          }
        );

        stream.pipe(uploadStream);
      });
    } catch (error) {
      console.error('Error uploading vessel image to Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Upload multiple vessel images to Cloudinary
   * @param files Array of files to upload
   * @param id The vessel ID
   * @returns Array of URLs for the uploaded images
   */
  async uploadMultipleVesselImages(files: Express.Multer.File[], id: string): Promise<string[]> {
    try {
      // Create an array of promises for each file upload
      const uploadPromises = files.map(file => this.uploadVesselImage(file, id));
      
      // Wait for all uploads to complete
      const imageUrls = await Promise.all(uploadPromises);
      
      return imageUrls;
    } catch (error) {
      console.error('Error uploading multiple vessel images to Cloudinary:', error);
      throw error;
    }
  }
}

export default new CloudinaryService();