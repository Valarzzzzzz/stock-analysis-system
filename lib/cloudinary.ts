import { v2 as cloudinary } from 'cloudinary';

// 配置 Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

/**
 * 上传图片到 Cloudinary
 * @param buffer 图片 Buffer
 * @param filename 原始文件名
 * @returns 图片 URL
 */
export async function uploadImage(buffer: Buffer, filename: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'stock-analysis',
        public_id: `${Date.now()}_${filename.replace(/\.[^.]+$/, '')}`,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(new Error('图片上传失败'));
        } else if (result) {
          resolve(result.secure_url);
        }
      }
    );

    uploadStream.end(buffer);
  });
}
