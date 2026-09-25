import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService', () => {
  const createService = async (config: Record<string, string>) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => config[key] },
        },
      ],
    }).compile();

    const service = module.get<EmailService>(EmailService);

    // Replace the Resend client so no real email is sent
    const send = jest.fn().mockResolvedValue({ data: { id: '1' }, error: null });
    (service as any).resend = { emails: { send } };

    return { service, send };
  };

  it('should be defined', async () => {
    const { service } = await createService({ RESEND_API_KEY: 'key' });

    expect(service).toBeDefined();
  });

  it('sends from EMAIL_FROM when it is set', async () => {
    const { service, send } = await createService({
      RESEND_API_KEY: 'key',
      EMAIL_FROM: 'Cargo System <no-reply@cargo.com>',
    });

    await service.sendEmail('a@b.com', 'Subject', '<p>Hi</p>');

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'Cargo System <no-reply@cargo.com>' }),
    );
  });

  it('falls back to the test sender when EMAIL_FROM is empty', async () => {
    const { service, send } = await createService({
      RESEND_API_KEY: 'key',
      EMAIL_FROM: '',
    });

    await service.sendEmail('a@b.com', 'Subject', '<p>Hi</p>');

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'onboarding@resend.dev' }),
    );
  });

  it("falls back to Resend's test sender", async () => {
    const { service, send } = await createService({ RESEND_API_KEY: 'key' });

    await service.sendEmail('a@b.com', 'Subject', '<p>Hi</p>');

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'onboarding@resend.dev' }),
    );
  });
});
