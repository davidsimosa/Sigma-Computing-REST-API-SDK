import { describe, it, expect } from 'vitest';
import { createSigmaClient } from '../src/client';
import { server, http, HttpResponse, BASE_URL } from './helpers/server';
import {
  teamFixture,
  teamListFixture,
  teamMemberListFixture,
  teamUaAssignmentListFixture,
  TEAM_ID,
  MEMBER_ID,
  UA_ID,
} from './helpers/fixtures';

const sigma = createSigmaClient({
  baseUrl: BASE_URL,
  accessToken: 'test-token',
});

describe('TeamsResource', () => {
  describe('list', () => {
    it('returns a page of teams', async () => {
      server.use(
        http.get(`${BASE_URL}/v2.1/teams`, () =>
          HttpResponse.json(teamListFixture),
        ),
      );
      const result = await sigma.teams.list();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].teamId).toBe(TEAM_ID);
    });
  });

  describe('listAll', () => {
    it('returns all teams as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2.1/teams`, () =>
          HttpResponse.json(teamListFixture),
        ),
      );
      const all = await sigma.teams.listAll().toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('posts to /v2/teams and returns the new team', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`${BASE_URL}/v2/teams`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(teamFixture);
        }),
      );
      const result = await sigma.teams.create({ name: 'Data Team' });
      expect(result.teamId).toBe(TEAM_ID);
      expect(capturedBody).toMatchObject({ name: 'Data Team' });
    });
  });

  describe('get', () => {
    it('fetches a team by ID', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/teams/${TEAM_ID}`, () =>
          HttpResponse.json(teamFixture),
        ),
      );
      const result = await sigma.teams.get(TEAM_ID);
      expect(result.teamId).toBe(TEAM_ID);
      expect(result.name).toBe('Data Team');
    });
  });

  describe('update', () => {
    it('patches a team and returns updated data', async () => {
      const updated = { ...teamFixture, name: 'Analytics Team' };
      let capturedBody: unknown;
      server.use(
        http.patch(`${BASE_URL}/v2/teams/${TEAM_ID}`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(updated);
        }),
      );
      const result = await sigma.teams.update(TEAM_ID, {
        name: 'Analytics Team',
      });
      expect(result.name).toBe('Analytics Team');
      expect(capturedBody).toMatchObject({ name: 'Analytics Team' });
    });
  });

  describe('delete', () => {
    it('sends DELETE to /v2/teams/{teamId}', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(`${BASE_URL}/v2/teams/${TEAM_ID}`, () => {
          deleteCalled = true;
          return HttpResponse.json({ teamId: TEAM_ID });
        }),
      );
      await sigma.teams.delete(TEAM_ID);
      expect(deleteCalled).toBe(true);
    });
  });

  describe('listMembers', () => {
    it('fetches members of a team', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/teams/${TEAM_ID}/members`, () =>
          HttpResponse.json(teamMemberListFixture),
        ),
      );
      const result = await sigma.teams.listMembers(TEAM_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listMembersAll', () => {
    it('returns all team members as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/teams/${TEAM_ID}/members`, () =>
          HttpResponse.json(teamMemberListFixture),
        ),
      );
      const all = await sigma.teams.listMembersAll(TEAM_ID).toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('updateMembers', () => {
    it('patches member updates to the team', async () => {
      let capturedBody: unknown;
      server.use(
        http.patch(
          `${BASE_URL}/v2/teams/${TEAM_ID}/members`,
          async ({ request }) => {
            capturedBody = await request.json();
            return HttpResponse.json(teamMemberListFixture);
          },
        ),
      );
      await sigma.teams.updateMembers(TEAM_ID, { add: [MEMBER_ID] });
      expect(capturedBody).toMatchObject({ add: [MEMBER_ID] });
    });
  });

  describe('listUserAttributeAssignments', () => {
    it('fetches user attribute assignments for a team', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/teams/${TEAM_ID}/user-attributes`, () =>
          HttpResponse.json(teamUaAssignmentListFixture),
        ),
      );
      const result = await sigma.teams.listUserAttributeAssignments(TEAM_ID);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('listUserAttributeAssignmentsAll', () => {
    it('returns all UA assignments as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/teams/${TEAM_ID}/user-attributes`, () =>
          HttpResponse.json(teamUaAssignmentListFixture),
        ),
      );
      const all = await sigma.teams
        .listUserAttributeAssignmentsAll(TEAM_ID)
        .toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('assignUserAttributesTo', () => {
    it('posts user attribute assignments to a team', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(
          `${BASE_URL}/v2/teams/${TEAM_ID}/assignedUserAttributes`,
          async ({ request }) => {
            capturedBody = await request.json();
            return HttpResponse.json(teamUaAssignmentListFixture);
          },
        ),
      );
      await sigma.teams.assignUserAttributesTo(TEAM_ID, {
        assignments: [
          { userAttributeId: UA_ID, value: { val: 'us-east', type: 'string' } },
        ],
      });
      expect(capturedBody).toMatchObject({
        assignments: [{ userAttributeId: UA_ID }],
      });
    });
  });

  describe('hydration — membersResource', () => {
    it('get: preserves the response members field and exposes membersResource accessor', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/teams/${TEAM_ID}`, () =>
          HttpResponse.json(teamFixture),
        ),
      );
      const team = await sigma.teams.get(TEAM_ID);
      // The response field must survive hydration
      expect(team.members).toEqual([MEMBER_ID]);
      // The sub-resource accessor must exist under the renamed key
      expect(typeof team.membersResource).toBe('object');
      expect(typeof team.membersResource.list).toBe('function');
      expect(typeof team.membersResource.listAll).toBe('function');
      expect(typeof team.membersResource.update).toBe('function');
    });

    it('membersResource.list: fetches team members via the hydrated accessor', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/teams/${TEAM_ID}`, () =>
          HttpResponse.json(teamFixture),
        ),
        http.get(`${BASE_URL}/v2/teams/${TEAM_ID}/members`, () =>
          HttpResponse.json(teamMemberListFixture),
        ),
      );
      const team = await sigma.teams.get(TEAM_ID);
      const result = await team.membersResource.list();
      expect(result.entries).toHaveLength(1);
    });

    it('membersResource.listAll: auto-paginates via the hydrated accessor', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/teams/${TEAM_ID}`, () =>
          HttpResponse.json(teamFixture),
        ),
        http.get(`${BASE_URL}/v2/teams/${TEAM_ID}/members`, () =>
          HttpResponse.json(teamMemberListFixture),
        ),
      );
      const team = await sigma.teams.get(TEAM_ID);
      const all = await team.membersResource.listAll().toArray();
      expect(all).toHaveLength(1);
    });

    it('list: exposes membersResource accessor on list entries', async () => {
      server.use(
        http.get(`${BASE_URL}/v2.1/teams`, () =>
          HttpResponse.json({
            entries: [teamFixture],
            nextPage: null,
            total: 1,
          }),
        ),
      );
      const page = await sigma.teams.list();
      expect(typeof page.entries[0].membersResource).toBe('object');
      expect(typeof page.entries[0].membersResource.list).toBe('function');
    });
  });

  describe('list_v2', () => {
    it('returns a page of teams from the v2 endpoint', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/teams`, () =>
          HttpResponse.json(teamListFixture),
        ),
      );
      const result = await sigma.teams.list_v2();
      const entries = result.entries as readonly { teamId: string }[];
      expect(entries).toHaveLength(1);
      expect(entries[0].teamId).toBe(TEAM_ID);
    });
  });

  describe('list_v2All', () => {
    it('returns all teams from the v2 endpoint as a flat array', async () => {
      server.use(
        http.get(`${BASE_URL}/v2/teams`, () =>
          HttpResponse.json(teamListFixture),
        ),
      );
      const all = await sigma.teams.list_v2All().toArray();
      expect(all).toHaveLength(1);
    });
  });
});
