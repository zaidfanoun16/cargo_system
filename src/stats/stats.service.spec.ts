import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { StatsService } from './stats.service';

describe('StatsService', () => {
  let service: StatsService;

  const dataSource = { query: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        { provide: getDataSourceToken(), useValue: dataSource },
      ],
    }).compile();

    service = module.get<StatsService>(StatsService);
  });

  it('turns query results into dashboard numbers', async () => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // PostgreSQL returns counts and sums as strings
    dataSource.query.mockImplementation(async (sql: string) => {
      if (sql.includes('"bookedDays"')) {
        return [{ cars: '3', days: '30', bookedDays: '17' }];
      }
      if (sql.includes('LIMIT 5')) {
        return [
          { id: 1, brand: 'Toyota', model: 'Corolla', reservations: '3', revenue: '900.00' },
        ];
      }
      if (sql.includes('TO_CHAR')) {
        return [{ month: thisMonth, revenue: '900.00', reservations: '2' }];
      }
      if (sql.includes('GROUP BY "status"')) {
        return [{ status: 'COMPLETED', count: '3' }];
      }
      return [{ users: '3', cars: '4', reservations: '7', revenue: '1380.00' }];
    });

    const stats = await service.getStats();

    expect(stats.totals).toEqual({
      users: 3,
      cars: 4,
      reservations: 7,
      revenue: 1380,
    });

    // Statuses without reservations are 0
    expect(stats.reservationsByStatus).toEqual({
      PENDING: 0,
      CONFIRMED: 0,
      CANCELLED: 0,
      COMPLETED: 3,
    });

    // 12 months, ending with this month; empty months are 0
    expect(stats.revenueByMonth).toHaveLength(12);
    expect(stats.revenueByMonth[11]).toEqual({
      month: thisMonth,
      revenue: 900,
      reservations: 2,
    });
    expect(stats.revenueByMonth[0].revenue).toBe(0);

    expect(stats.topCars).toEqual([
      { id: 1, car: 'Toyota Corolla', reservations: 3, revenue: 900 },
    ]);

    // 17 booked days out of 3 cars x 30 days
    expect(stats.occupancy).toEqual({
      bookedDays: 17,
      availableDays: 90,
      percentage: 18.9,
    });
  });

  it('reports 0% occupancy when there are no active cars', async () => {
    dataSource.query.mockImplementation(async (sql: string) => {
      if (sql.includes('"bookedDays"')) {
        return [{ cars: '0', days: '30', bookedDays: '0' }];
      }
      if (sql.includes('SELECT\n          (SELECT COUNT(*)')) {
        return [{ users: '0', cars: '0', reservations: '0', revenue: '0' }];
      }
      return [];
    });

    const stats = await service.getStats();

    expect(stats.occupancy.percentage).toBe(0);
  });
});
