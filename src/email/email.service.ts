import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import {
  CANCELLATION_CUTOFF_HOURS,
  NO_SHOW_GRACE_HOURS,
  cancellationWindow,
} from '../reservations/reservation-policy';
import { ReservationStatus } from '../reservations/enums/reservation-status.enum';

@Injectable()
export class EmailService {
  private readonly resend: Resend;

  // Sender address. Resend's test sender works without a verified domain,
  // but can only deliver to the Resend account owner's email.
  private readonly from: string;

  // Where the buttons in the emails lead, e.g. https://cargo.example.com
  private readonly frontendUrl: string;

  // Times in the emails are shown in this zone (default: Palestine)
  private readonly timeZone: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');

    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    this.resend = new Resend(apiKey);

    this.from =
      this.configService.get<string>('EMAIL_FROM') || 'onboarding@resend.dev';

    this.frontendUrl = (
      this.configService.get<string>('FRONTEND_URL') ||
      this.configService.get<string>('CORS_ORIGIN')?.split(',')[0] ||
      'http://localhost:5173'
    ).replace(/\/$/, '');

    this.timeZone =
      this.configService.get<string>('APP_TIME_ZONE') || 'Asia/Hebron';
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
  ) {
    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to: [to],
      subject,
      html,
    });

    if (error) {
      throw new InternalServerErrorException(
        `Failed to send email: ${error.message}`,
      );
    }

    return data;
  }

  // Email a 6-digit verification code
  async sendVerificationCode(
    to: string,
    fullName: string,
    code: string,
    message = 'أدخل هذا الرمز لتفعيل بريدك الإلكتروني:',
  ) {
    await this.sendEmail(
      to,
      'رمز التحقق من CarGo',
      `
        <div dir="rtl" style="
          font-family: Tahoma, Arial, sans-serif;
          max-width: 500px;
          margin: 0 auto;
          padding: 30px;
          text-align: center;
          color: #333;
        ">

          <h2 style="margin-bottom: 10px;" dir="ltr">
            CarGo 🚗
          </h2>

          <p style="font-size: 16px;">
            مرحباً ${escapeHtml(fullName)}،
          </p>

          <p style="font-size: 15px; line-height: 1.6;">
            ${message}
          </p>

          <p dir="ltr" style="
            margin: 20px 0;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #2563eb;
          ">
            ${code}
          </p>

          <p style="font-size: 13px; color: #777;">
            تنتهي صلاحية هذا الرمز خلال 10 دقائق.
          </p>

        </div>
      `,
    );
  }

  // Tell a user their reservation was confirmed, cancelled or completed,
  // with everything they need: car, plate, pickup and return times,
  // duration and price (in shekels), and what happens next
  async sendReservationStatus(
    to: string,
    details: ReservationEmailDetails,
  ) {
    const text = statusText(details, (date) => this.formatDateTime(date));

    const rows: [string, string][] = [
      ['رقم الحجز', toArabicDigits(details.reservationId)],
      ['السيارة', escapeHtml(details.car)],
      ['رقم اللوحة', `<span dir="ltr">${escapeHtml(details.licensePlate)}</span>`],
      ['الاستلام', this.formatDateTime(details.startDate)],
      ['الإرجاع', this.formatDateTime(details.endDate)],
      ['المدة', formatDuration(details.startDate, details.endDate)],
    ];

    const priceRows: [string, string][] = [
      ['السعر الأساسي', formatShekels(details.basePrice)],
    ];

    if (details.discountPercent > 0) {
      priceRows.push([
        `خصم المدة الطويلة (${toArabicDigits(details.discountPercent)}٪)`,
        `−${formatShekels(details.basePrice - details.totalPrice)}`,
      ]);
    }

    const row = ([label, value]: [string, string]) => `
      <tr>
        <td style="padding: 10px 0; color: #6b737b; border-bottom: 1px solid #eef0f2;">${label}</td>
        <td style="padding: 10px 0; text-align: left; font-weight: bold; border-bottom: 1px solid #eef0f2;">${value}</td>
      </tr>`;

    const steps = text.steps
      .map((step) => `<li style="margin-bottom: 6px;">${step}</li>`)
      .join('');

    await this.sendEmail(
      to,
      `CarGo · حجز رقم ${details.reservationId}: ${text.subject}`,
      `
        <div dir="rtl" style="background: #f5f6f7; padding: 24px 12px; font-family: Tahoma, Arial, sans-serif;">
          <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; color: #1f2429;">

            <div style="background: #3f4a54; padding: 20px 24px; color: #ffffff; font-size: 22px; font-weight: bold;">
              <span dir="ltr">CarGo</span>
            </div>

            <div style="padding: 24px;">
              <span style="display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 13px; font-weight: bold; background: ${text.badgeBackground}; color: ${text.color};">
                ${text.badge}
              </span>

              <h2 style="margin: 14px 0 8px; font-size: 22px; color: #1f2429;">
                ${text.title}
              </h2>

              <p style="margin: 0 0 6px; font-size: 16px;">
                مرحباً ${escapeHtml(details.fullName)}،
              </p>

              <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #4b545c;">
                ${text.message}
              </p>

              ${
                details.status === 'CONFIRMED' && details.handoverCode
                  ? `<div style="margin-top: 20px; padding: 16px; border: 2px dashed #3f4a54; border-radius: 12px; text-align: center;">
                      <p style="margin: 0; font-size: 13px; color: #6b737b;">رمز الاستلام</p>
                      <p dir="ltr" style="margin: 6px 0; font-size: 30px; font-weight: bold; letter-spacing: 8px; color: #1f2429;">${details.handoverCode}</p>
                      <p style="margin: 0; font-size: 12px; color: #6b737b;">اعرضه للموظف عند الاستلام، أو افتح رمز QR من صفحة حجوزاتي.</p>
                    </div>`
                  : ''
              }

              <table style="width: 100%; margin: 20px 0 8px; border-collapse: collapse; font-size: 14px;">
                ${rows.map(row).join('')}
              </table>

              <table style="width: 100%; margin: 8px 0; border-collapse: collapse; font-size: 14px;">
                ${priceRows.map(row).join('')}
                <tr>
                  <td style="padding: 12px 0 0; font-size: 16px; font-weight: bold;">المجموع</td>
                  <td style="padding: 12px 0 0; text-align: left; font-size: 20px; font-weight: bold;">${formatShekels(details.totalPrice)}</td>
                </tr>
              </table>

              ${
                steps
                  ? `<div style="margin-top: 20px; padding: 16px; background: #f5f6f7; border-radius: 12px; font-size: 14px; line-height: 1.6;">
                      <p style="margin: 0 0 8px; font-weight: bold;">${text.stepsTitle}</p>
                      <ul style="margin: 0; padding-right: 20px;">${steps}</ul>
                    </div>`
                  : ''
              }

              <div style="margin-top: 24px; text-align: center;">
                <a href="${this.frontendUrl}${text.button.path}" style="display: inline-block; padding: 12px 24px; background: #3f4a54; color: #ffffff; border-radius: 12px; text-decoration: none; font-weight: bold;">
                  ${text.button.label}
                </a>
              </div>
            </div>

            <p style="margin: 0; padding: 16px 24px; background: #fafafa; font-size: 12px; color: #8a929a; text-align: center;">
              وصلك هذا الإيميل لأن لديك حجزاً في CarGo. الأوقات بتوقيت فلسطين.
            </p>
          </div>
        </div>
      `,
    );
  }

  // "الخميس، ١٥ أكتوبر ٢٠٣٠، ١٠:٠٠ ص" in the business's time zone
  private formatDateTime(date: Date) {
    return new Intl.DateTimeFormat('ar-EG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: this.timeZone,
    }).format(new Date(date));
  }
}

export type ReservationEmailDetails = {
  fullName: string;
  reservationId: number;
  status: 'CONFIRMED' | 'PICKED_UP' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  car: string;
  licensePlate: string;
  startDate: Date;
  endDate: Date;
  basePrice: number;
  discountPercent: number;
  totalPrice: number;
  // Who cancelled: the customer, an admin, or the system (not confirmed in time)
  cancelledBy?: 'user' | 'admin' | 'system';
  // The customer cancelled after the free cancellation period
  lateCancellation?: boolean;
  // Code the customer shows at pickup (confirmed reservations)
  handoverCode?: string;
};

type StatusText = {
  subject: string;
  badge: string;
  title: string;
  message: string;
  color: string;
  badgeBackground: string;
  stepsTitle: string;
  steps: string[];
  button: { label: string; path: string };
};

function statusText(
  details: ReservationEmailDetails,
  formatDateTime: (date: Date) => string,
): StatusText {
  if (details.status === 'CONFIRMED') {
    const { freeUntil } = cancellationWindow({
      status: ReservationStatus.CONFIRMED,
      startDate: details.startDate,
    })!;

    const cancelStep =
      freeUntil > new Date()
        ? `الإلغاء مجاني من صفحة حجوزاتي حتى ${formatDateTime(freeUntil)}. بعدها يُحتسب الإلغاء متأخراً، ولا يمكن الإلغاء قبل الاستلام بأقل من ${hoursText(CANCELLATION_CUTOFF_HOURS)}.`
        : `الإلغاء الآن يُحتسب متأخراً، ولا يمكن الإلغاء قبل الاستلام بأقل من ${hoursText(CANCELLATION_CUTOFF_HOURS)}.`;

    return {
      subject: 'تم التأكيد',
      badge: 'مؤكد',
      title: 'تم تأكيد حجزك ✅',
      message: 'سيارتك محجوزة لك وجاهزة في موعد الاستلام. نراك قريباً!',
      color: '#15803d',
      badgeBackground: '#dcfce7',
      stepsTitle: 'قبل موعد الاستلام',
      steps: [
        'أحضر هويتك ورخصة قيادة سارية المفعول.',
        'اعرض رمز الاستلام (QR) من صفحة حجوزاتي للموظف، فيمسحه ويسلّمك السيارة.',
        `احضر في موعد الاستلام المذكور أعلاه. إذا لم تحضر خلال ${hoursText(NO_SHOW_GRACE_HOURS)} يُلغى الحجز ويُسجَّل عدم حضور. إذا كنت ستتأخر، اضغط "سأتأخر" في صفحة حجوزاتي لنحتفظ بالسيارة وقتاً إضافياً.`,
        cancelStep,
        'تكرار الإلغاء المتأخر أو عدم الحضور يوقف إمكانية الحجز من حسابك.',
      ],
      button: { label: 'عرض حجوزاتي', path: '/my-bookings' },
    };
  }

  if (details.status === 'PICKED_UP') {
    return {
      subject: 'تم الاستلام',
      badge: 'مستلمة',
      title: 'استلمت السيارة، رحلة سعيدة 🚗',
      message: 'تم تسليمك السيارة. نتمنى لك رحلة آمنة وممتعة.',
      color: '#1d4ed8',
      badgeBackground: '#dbeafe',
      stepsTitle: 'عند الإرجاع',
      steps: [
        'أرجع السيارة إلى المكتب في موعد الإرجاع المذكور أعلاه.',
        'أعد السيارة بنفس الحالة ومستوى الوقود الذي استلمتها به.',
      ],
      button: { label: 'عرض حجوزاتي', path: '/my-bookings' },
    };
  }

  if (details.status === 'NO_SHOW') {
    return {
      subject: 'لم يتم الاستلام',
      badge: 'لم يحضر',
      title: 'لم تستلم السيارة في الموعد',
      message:
        'انتهت مهلة الاستلام دون حضورك، فسُجِّل عدم حضور على حسابك، وتكراره يوقف إمكانية الحجز. إذا وصلت قبل نهاية مدة الحجز والسيارة ما زالت متاحة، يمكن للموظف تسليمك إياها بنفس رمز الاستلام، وتُلغى علامة عدم الحضور.',
      color: '#b45309',
      badgeBackground: '#fef3c7',
      stepsTitle: '',
      steps: [],
      button: { label: 'احجز سيارة أخرى', path: '/cars' },
    };
  }

  if (details.status === 'COMPLETED') {
    return {
      subject: 'اكتمل',
      badge: 'مكتمل',
      title: 'شكراً لاستئجارك من CarGo 🚗',
      message: 'اكتمل حجزك، ونتمنى أن تكون رحلتك ممتعة.',
      color: '#3f4a54',
      badgeBackground: '#e6e9ec',
      stepsTitle: 'شاركنا رأيك',
      steps: ['قيّم السيارة من صفحة حجوزاتي، فتقييمك يساعد العملاء الآخرين.'],
      button: { label: 'قيّم السيارة', path: '/my-bookings' },
    };
  }

  const message = {
    user: details.lateCancellation
      ? 'لقد ألغيت هذا الحجز بعد انتهاء فترة الإلغاء المجاني، لذلك احتُسب إلغاءً متأخراً. تكرار ذلك يوقف إمكانية الحجز.'
      : 'لقد ألغيت هذا الحجز بنجاح، ولن يتم احتسابه.',
    admin: 'نعتذر منك، تم إلغاء حجزك من قبل إدارة CarGo. تواصل معنا إذا كان لديك أي سؤال.',
    system: 'تم إلغاء الحجز تلقائياً لأنه لم يتم تأكيده في الوقت المحدد.',
  }[details.cancelledBy ?? 'admin'];

  return {
    subject: 'تم الإلغاء',
    badge: 'ملغي',
    title: 'تم إلغاء الحجز',
    message,
    color: '#b91c1c',
    badgeBackground: '#fee2e2',
    stepsTitle: '',
    steps: [],
    button: { label: 'احجز سيارة أخرى', path: '/cars' },
  };
}

// Prices are in Israeli shekels: "‏١٬٤٠٠ ₪", or "‏٢٠٩٫٩٨ ₪" with agorot
export function formatShekels(amount: number) {
  const value = Math.round(amount * 100) / 100;

  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// "ساعتين", "٢٤ ساعة"
function hoursText(hours: number) {
  if (hours === 1) return 'ساعة';
  if (hours === 2) return 'ساعتين';
  return `${toArabicDigits(hours)} ${hours <= 10 ? 'ساعات' : 'ساعة'}`;
}

function toArabicDigits(value: number) {
  return value.toLocaleString('ar-EG', { useGrouping: false });
}

// "٣ أيام و٤ ساعات", with Arabic plurals
export function formatDuration(startDate: Date, endDate: Date) {
  const totalHours = Math.round(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / 3_600_000,
  );
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  const plural = (count: number, [one, two, few, many]: string[]) => {
    if (count === 1) return one;
    if (count === 2) return two;
    const number = toArabicDigits(count);
    return count <= 10 ? `${number} ${few}` : `${number} ${many}`;
  };

  const parts = [
    days > 0 && plural(days, ['يوم واحد', 'يومان', 'أيام', 'يوماً']),
    hours > 0 && plural(hours, ['ساعة واحدة', 'ساعتان', 'ساعات', 'ساعة']),
  ].filter(Boolean);

  return parts.join(' و');
}

// User-provided text (names, car models) must not be able to inject HTML
function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
