import { BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryService } from './cloudinary.service';

describe('CloudinaryService', () => {
  const configured = new CloudinaryService({
    get: () => 'value',
  } as unknown as ConfigService);

  afterEach(() => jest.restoreAllMocks());

  it('explains a 403 from Cloudinary as missing permissions', async () => {
    jest.spyOn(cloudinary.uploader, 'destroy').mockRejectedValue({
      message: 'Server returned unexpected status code - 403',
      http_code: 403,
    });

    const error = await configured.deleteImage('cars/x').catch((e) => e);

    expect(error).toBeInstanceOf(BadGatewayException);
    expect(error.message).toContain('HTTP 403');
    expect(error.message).toContain('missing permissions');
  });

  it('refuses to work without Cloudinary keys', async () => {
    const notConfigured = new CloudinaryService({
      get: () => undefined,
    } as unknown as ConfigService);

    await expect(notConfigured.deleteImage('cars/x')).rejects.toThrow(
      'Image storage is not configured',
    );
  });
});
