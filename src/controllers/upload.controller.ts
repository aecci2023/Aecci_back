import { Request, Response } from 'express';

export class UploadController {
  async uploadFile(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      // Multer S3 adds the 'location' and 'key' properties to the file object
      const file = req.file as Express.MulterS3.File;
      
      res.status(200).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          url: file.location,
          key: file.key,
          name: file.originalname,
        },
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ success: false, message: 'File upload failed' });
    }
  }
}

export const uploadController = new UploadController();
