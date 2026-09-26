import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService, formatDuration, formatShekels } from './email.service';

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
    const send = jest
      .fn()
      .mockResolvedValue({ data: { id: '1' }, error: null });
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

  describe('reservation status email', () => {
    const details = {
      fullName: 'Nour',
      reservationId: 15,
      status: 'CONFIRMED' as const,
      car: 'تويوتا كامري',
      licensePlate: 'AB-123',
      // 10:00 in Palestine (UTC+3 in October)
      startDate: new Date('2030-10-01T07:00:00Z'),
      endDate: new Date('2030-10-08T07:00:00Z'),
      basePrice: 1400,
      discountPercent: 10,
      totalPrice: 1260,
    };

    const sentEmail = async (extra: object = {}) => {
      const { service, send } = await createService({
        RESEND_API_KEY: 'key',
        FRONTEND_URL: 'https://cargo.test/',
      });
      await service.sendReservationStatus('a@b.com', { ...details, ...extra });
      return send.mock.calls[0][0] as { subject: string; html: string };
    };

    it('includes the car, plate, times, duration and prices in shekels', async () => {
      const email = await sentEmail();

      expect(email.subject).toBe('CarGo · حجز رقم 15: تم التأكيد');
      expect(email.html).toContain('تويوتا كامري');
      expect(email.html).toContain('AB-123');
      expect(email.html).toContain('١٠:٠٠');
      expect(email.html).toContain('٧ أيام');
      expect(email.html).toContain(formatShekels(1260));
      expect(email.html).toContain('₪');
      expect(email.html).toContain('خصم المدة الطويلة (١٠٪)');
      expect(email.html).toContain('href="https://cargo.test/my-bookings"');
    });

    it('says who cancelled', async () => {
      const byUser = await sentEmail({
        status: 'CANCELLED',
        cancelledBy: 'user',
      });
      const byAdmin = await sentEmail({
        status: 'CANCELLED',
        cancelledBy: 'admin',
      });
      const expired = await sentEmail({
        status: 'CANCELLED',
        cancelledBy: 'system',
      });

      expect(byUser.html).toContain('لقد ألغيت هذا الحجز');
      expect(byAdmin.html).toContain('من قبل إدارة CarGo');
      expect(expired.html).toContain('تلقائياً');
    });

    it('tells when free cancellation ends', async () => {
      const email = await sentEmail();

      // 24 hours before pickup, in Palestine time
      expect(email.html).toContain('الإلغاء مجاني من صفحة حجوزاتي حتى');
      expect(email.html).toContain('٣٠ سبتمبر ٢٠٣٠');
    });

    it('shows the handover code in the confirmation', async () => {
      const email = await sentEmail({ handoverCode: '042917' });

      expect(email.html).toContain('رمز الاستلام');
      expect(email.html).toContain('042917');
    });

    it('says when a cancellation was late', async () => {
      const email = await sentEmail({
        status: 'CANCELLED',
        cancelledBy: 'user',
        lateCancellation: true,
      });

      expect(email.html).toContain('احتُسب إلغاءً متأخراً');
    });

    it('has an email for pickup and for a no-show', async () => {
      expect((await sentEmail({ status: 'PICKED_UP' })).subject).toBe(
        'CarGo · حجز رقم 15: تم الاستلام',
      );
      expect((await sentEmail({ status: 'NO_SHOW' })).subject).toBe(
        'CarGo · حجز رقم 15: لم يتم الاستلام',
      );
    });

    it('escapes HTML in names', async () => {
      const email = await sentEmail({ fullName: '<b>x</b>' });

      expect(email.html).toContain('&lt;b&gt;x&lt;/b&gt;');
    });
  });

  it('formats durations with Arabic plurals', () => {
    const at = (hours: number) =>
      new Date(Date.UTC(2030, 0, 1) + hours * 3_600_000);
    const start = at(0);

    expect(formatDuration(start, at(3))).toBe('٣ ساعات');
    expect(formatDuration(start, at(24))).toBe('يوم واحد');
    expect(formatDuration(start, at(50))).toBe('يومان وساعتان');
    expect(formatDuration(start, at(24 * 12 + 1))).toBe('١٢ يوماً وساعة واحدة');
  });

  it('formats prices in shekels', () => {
    expect(formatShekels(200)).toContain('٢٠٠');
    expect(formatShekels(200)).toContain('₪');
    expect(formatShekels(209.98)).toContain('٢٠٩٫٩٨');
  });
});
