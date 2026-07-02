import multer from 'multer';
import multerS3 from 'multer-s3';
import { s3Client } from '../config/s3.config';
import { config } from '../config/config';
import path from 'path';

export const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: config.AWS_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req: any, file, cb) {
      const folderParam = req.query?.folder as string;
      const folder = folderParam === 'catalog' ? 'global/catelog' : 'global/documents';
      const safeFileName = file.originalname.replace(/[\/\\]/g, '_');
      const uniqueSuffix = Date.now().toString() + '-' + Math.round(Math.random() * 1e9);
      cb(null, 'aecciglobal/' + folder + '/' + uniqueSuffix + '-' + safeFileName);
    },
  }),
});
