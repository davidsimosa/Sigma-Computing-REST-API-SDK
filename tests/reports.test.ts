import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import {
  reportFixture,
  reportListFixture,
  reportScheduleFixture,
  reportScheduleListFixture,
  reportSourcesFixture,
  REPORT_ID,
  SCHEDULE_ID,
} from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('ReportsResource', () => {
  describe('list', () => {
    it('returns a page of reports', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/reports`, () =>
          HttpResponse.json(reportListFixture),
        ),
      );
      const result = await sigma.reports.list();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].reportId).toBe(REPORT_ID);
    });
  });

  describe('listAll', () => {
    it('returns all reports as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/reports`, () =>
          HttpResponse.json(reportListFixture),
        ),
      );
      const all = await sigma.reports.listAll().toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('posts to /v2/reports and returns the new report', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE_URL}/v2/reports`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(reportFixture);
        }),
      );
      const result = await sigma.reports.create({ name: 'My Report' } as never);
      expect(result.reportId).toBe(REPORT_ID);
      expect(capturedBody).toMatchObject({ name: 'My Report' });
    });
  });

  describe('get', () => {
    it('fetches a report by ID', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/reports/${REPORT_ID}`, () =>
          HttpResponse.json(reportFixture),
        ),
      );
      const result = await sigma.reports.get(REPORT_ID);
      expect(result.reportId).toBe(REPORT_ID);
    });
  });

  describe('copy', () => {
    it('copies a report', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/reports/${REPORT_ID}/copy`, () =>
          HttpResponse.json({ ...reportFixture, reportId: 'report-copy-1' }),
        ),
      );
      const result = await sigma.reports.copy(REPORT_ID, {
        destinationFolderId: 'folder-1',
      } as never);
      expect(result).toBeDefined();
    });
  });

  describe('export', () => {
    it('exports a report', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/reports/${REPORT_ID}/export`, () =>
          HttpResponse.json({ exportId: 'export-1' }),
        ),
      );
      const result = await sigma.reports.export(REPORT_ID, {} as never);
      expect(result).toBeDefined();
    });
  });

  describe('listSchedules', () => {
    it('fetches schedules for a report', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/reports/${REPORT_ID}/schedules`, () =>
          HttpResponse.json(reportScheduleListFixture),
        ),
      );
      const result = await sigma.reports.listSchedules(REPORT_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listSchedulesAll', () => {
    it('returns all report schedules as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/reports/${REPORT_ID}/schedules`, () =>
          HttpResponse.json(reportScheduleListFixture),
        ),
      );
      const all = await sigma.reports.listSchedulesAll(REPORT_ID).toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('createSchedule', () => {
    it('creates a schedule for a report', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/reports/${REPORT_ID}/schedules`, () =>
          HttpResponse.json(reportScheduleFixture),
        ),
      );
      const result = await sigma.reports.createSchedule(REPORT_ID, {
        name: 'Daily',
      } as never);
      expect(result.scheduledNotificationId).toBe(SCHEDULE_ID);
    });
  });

  describe('updateSchedule', () => {
    it('patches a report schedule', async () => {
      server.use(
        http.patch(
          `${BASE_URL}/v2/reports/${REPORT_ID}/schedules/${SCHEDULE_ID}`,
          () => HttpResponse.json({ ...reportScheduleFixture, name: 'Weekly' }),
        ),
      );
      const result = await sigma.reports.updateSchedule(
        REPORT_ID,
        SCHEDULE_ID,
        { name: 'Weekly' } as never,
      );
      expect(result.scheduledNotificationId).toBe(SCHEDULE_ID);
    });
  });

  describe('deleteSchedule', () => {
    it('deletes a report schedule', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(
          `${BASE_URL}/v2/reports/${REPORT_ID}/schedules/${SCHEDULE_ID}`,
          () => {
            deleteCalled = true;
            return HttpResponse.json(reportScheduleFixture);
          },
        ),
      );
      await sigma.reports.deleteSchedule(REPORT_ID, SCHEDULE_ID);
      expect(deleteCalled).toBe(true);
    });
  });

  describe('send', () => {
    it('sends a report', async () => {
      server.use(
        http.post(`${BASE_URL}/v2/reports/${REPORT_ID}/send`, () =>
          HttpResponse.json({ success: true }),
        ),
      );
      const result = await sigma.reports.send(REPORT_ID, {
        recipients: [],
      } as never);
      expect(result).toBeDefined();
    });
  });

  describe('listSources', () => {
    it('fetches sources for a report as a bare array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/reports/${REPORT_ID}/sources`, () =>
          HttpResponse.json(reportSourcesFixture),
        ),
      );
      const result = await sigma.reports.listSources(REPORT_ID);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('allows narrowing to custom-sql variant', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/reports/${REPORT_ID}/sources`, () =>
          HttpResponse.json(reportSourcesFixture),
        ),
      );
      const result = await sigma.reports.listSources(REPORT_ID);
      const customSql = result.find((s) => s.type === 'custom-sql');
      expect(customSql).toBeDefined();
      if (customSql?.type === 'custom-sql') {
        expect(customSql.connectionId).toBeDefined();
        expect(customSql.definition).toBeDefined();
        expect(customSql.customSqlId).toBeDefined();
      }
    });
  });
});
