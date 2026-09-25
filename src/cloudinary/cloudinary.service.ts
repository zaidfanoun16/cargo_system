import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

// Stores images on Cloudinary. The app starts without Cloudinary keys;
// only uploading and deleting images needs them.
@Injectable()
export class CloudinaryService {
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    this.isConfigured = Boolean(cloudName && apiKey && apiSecret);

    if (this.isConfigured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
    }
  }

  // Upload an image and return its public URL and Cloudinary ID
  async uploadImage(file: Express.Multer.File, folder: string) {
    this.ensureConfigured();

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: 'image',
            // Cap the size so huge photos do not slow the site down
            transformation: [{ width: 1600, height: 1600, crop: 'limit' }],
          },
          (error, response) =>
            error || !response ? reject(error) : resolve(response),
        )
        .end(file.buffer);
    }).catch((error: { message?: string }) => {
      throw new InternalServerErrorException(
        `Failed to upload image: ${error?.message ?? 'unknown error'}`,
      );
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  async deleteImage(publicId: string) {
    this.ensureConfigured();

    await cloudinary.uploader.destroy(publicId);
  }

  private ensureConfigured() {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException(
        'Image storage is not configured (set the CLOUDINARY_* variables)',
      );
    }
  }
}
