import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import {
  memberFixture,
  memberListFixture,
  inodeListFixture,
  memberScheduleListFixture,
  memberTeamListFixture,
  MEMBER_ID,
} from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('MembersResource', () => {
  describe('list', () => {
    it('returns a page of members', async () => {
      server.use(
        http.get(`${BASE_URL}/v2.1/members`, () =>
          HttpResponse.json(memberListFixture),
        ),
      );
      const result = await sigma.members.list();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].memberId).toBe(MEMBER_ID);
    });

    it('passes query parameters', async () => {
      let capturedUrl: string | null = null;
      server.use(
        http.get(`${BASE_URL}/v2.1/members`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(memberListFixture);
        }),
      );
      await sigma.members.list({ limit: 10 });
      expect(capturedUrl).toContain('limit=10');
    });
  });

  describe('listAll', () => {
    it('returns all members as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2.1/members`, () =>
          HttpResponse.json(memberListFixture),
        ),
      );
      const all = await sigma.members.listAll().toArray();
      expect(all).toHaveLength(1);
      expect(all[0].memberId).toBe(MEMBER_ID);
    });
  });

  describe('create', () => {
    it('posts to /v2/members and returns the new member', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE_URL}/v2/members`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(memberFixture);
        }),
      );
      const result = await sigma.members.create({
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        memberType: 'viewer',
      });
      expect(result.memberId).toBe(MEMBER_ID);
      expect(capturedBody).toMatchObject({ email: 'jane@example.com' });
    });
  });

  describe('get', () => {
    it('fetches a member by ID', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/members/${MEMBER_ID}`, () =>
          HttpResponse.json(memberFixture),
        ),
      );
      const result = await sigma.members.get(MEMBER_ID);
      expect(result.memberId).toBe(MEMBER_ID);
      expect(result.email).toBe('jane@example.com');
    });
  });

  describe('update', () => {
    it('patches a member and returns updated data', async () => {
      const updated = { ...memberFixture, firstName: 'Janet' };
      let capturedBody: unknown;
      server.use(
        http.patch(
          `${BASE_URL}/v2/members/${MEMBER_ID}`,
          async ({ request }) => {
            capturedBody = await request.json();
            return HttpResponse.json(updated);
          },
        ),
      );
      const result = await sigma.members.update(MEMBER_ID, {
        firstName: 'Janet',
      });
      expect(result.firstName).toBe('Janet');
      expect(capturedBody).toMatchObject({ firstName: 'Janet' });
    });
  });

  describe('delete', () => {
    it('sends DELETE to /v2/members/{memberId}', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(`${BASE_URL}/v2/members/${MEMBER_ID}`, () => {
          deleteCalled = true;
          return HttpResponse.json({ memberId: MEMBER_ID });
        }),
      );
      await sigma.members.delete(MEMBER_ID);
      expect(deleteCalled).toBe(true);
    });
  });

  describe('listAccessibleInodes', () => {
    it('fetches accessible files for a member', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/members/${MEMBER_ID}/files`, () =>
          HttpResponse.json(inodeListFixture),
        ),
      );
      const result = await sigma.members.listAccessibleInodes(MEMBER_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listAccessibleInodesAll', () => {
    it('returns all accessible inodes as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/members/${MEMBER_ID}/files`, () =>
          HttpResponse.json(inodeListFixture),
        ),
      );
      const all = await sigma.members
        .listAccessibleInodesAll(MEMBER_ID)
        .toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('listFavoriteInodes', () => {
    it('fetches favorite files for a member', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/members/${MEMBER_ID}/files/favorites`, () =>
          HttpResponse.json(inodeListFixture),
        ),
      );
      const result = await sigma.members.listFavoriteInodes(MEMBER_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listFavoriteInodesAll', () => {
    it('returns all favorite inodes as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/members/${MEMBER_ID}/files/favorites`, () =>
          HttpResponse.json(inodeListFixture),
        ),
      );
      const all = await sigma.members
        .listFavoriteInodesAll(MEMBER_ID)
        .toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('listRecentInodes', () => {
    it('fetches recent files for a member', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/members/${MEMBER_ID}/files/recents`, () =>
          HttpResponse.json(inodeListFixture),
        ),
      );
      const result = await sigma.members.listRecentInodes(MEMBER_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listRecentInodesAll', () => {
    it('returns all recent inodes as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/members/${MEMBER_ID}/files/recents`, () =>
          HttpResponse.json(inodeListFixture),
        ),
      );
      const all = await sigma.members.listRecentInodesAll(MEMBER_ID).toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('listSchedules', () => {
    it('fetches scheduled exports for a member', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/members/${MEMBER_ID}/schedules`, () =>
          HttpResponse.json(memberScheduleListFixture),
        ),
      );
      const result = await sigma.members.listSchedules(MEMBER_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listSchedulesAll', () => {
    it('returns all schedules as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/members/${MEMBER_ID}/schedules`, () =>
          HttpResponse.json(memberScheduleListFixture),
        ),
      );
      const all = await sigma.members.listSchedulesAll(MEMBER_ID).toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('listTeams', () => {
    it('fetches teams for a member', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/members/${MEMBER_ID}/teams`, () =>
          HttpResponse.json(memberTeamListFixture),
        ),
      );
      const result = await sigma.members.listTeams(MEMBER_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listTeamsAll', () => {
    it('returns all teams as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/members/${MEMBER_ID}/teams`, () =>
          HttpResponse.json(memberTeamListFixture),
        ),
      );
      const all = await sigma.members.listTeamsAll(MEMBER_ID).toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('list_v2', () => {
    it('returns a page of members from the v2 endpoint', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/members`, () =>
          HttpResponse.json(memberListFixture),
        ),
      );
      const result = await sigma.members.list_v2();
      const entries = result.entries as readonly { memberId: string }[];
      expect(entries).toHaveLength(1);
      expect(entries[0].memberId).toBe(MEMBER_ID);
    });
  });

  describe('list_v2All', () => {
    it('returns all members from the v2 endpoint as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/members`, () =>
          HttpResponse.json(memberListFixture),
        ),
      );
      const all = await sigma.members.list_v2All().toArray();
      expect(all).toHaveLength(1);
    });
  });
});
