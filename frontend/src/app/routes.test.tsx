// The route table and role data must agree: every role's home and header
// link has to be a registered signed-in route, paths are unique, and
// placeholder pages name their story.
import { matchPath } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import { routes } from './routes';
import { homeFor, ROLES, roleHome, roleLabel, roleNavigation } from './roles';

const signedIn = routes.filter(route => route.access === 'signed-in');

function routeFor(path: string) {
  // Prefer an exact path; otherwise the first pattern that matches (e.g. /events/*).
  return routes.find(route => route.path === path) ?? routes.find(route => matchPath(route.path, path));
}

describe('route table', () => {
  test('every path is registered once', () => {
    const paths = routes.map(route => route.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  test('coming-soon pages name a Release 1 story', () => {
    for (const route of routes.filter(r => r.status === 'coming-soon')) {
      expect(route.story, route.path).toMatch(/^E\d{2}-S\d{2}$/);
    }
  });

  test('story IDs use the backlog format', () => {
    for (const route of routes.filter(r => r.story)) {
      expect(route.story, route.path).toMatch(/^E\d{2}-S\d{2}$/);
    }
  });

  test('sign-in and registration pages are public; profile and notifications are not', () => {
    for (const path of ['/', '/login', '/register', '/forgot-password', '/reset-password', '/verify']) {
      expect(routeFor(path)?.access, path).toBe('public');
    }
    for (const path of ['/profile', '/notifications', '/coordinator', '/events', '/venue/inventory', '/coordinator-lead/queue', '/safety/queue']) {
      expect(routeFor(path)?.access, path).toBe('signed-in');
    }
  });
});

describe('roles', () => {
  test.each(ROLES)('%s has a signed-in home page that is in its header links', role => {
    const home = roleHome[role];
    expect(routeFor(home)?.access).toBe('signed-in');
    expect(roleNavigation[role].map(item => item.to)).toContain(home);
  });

  test.each(ROLES)('every header link for %s is a registered signed-in route', role => {
    for (const item of roleNavigation[role]) {
      const route = routeFor(item.to);
      expect(route, item.to).toBeDefined();
      expect(signedIn).toContain(route);
    }
  });

  test('an unknown or missing role goes to the landing page', () => {
    expect(homeFor('not_a_role')).toBe('/');
    expect(homeFor(undefined)).toBe('/');
  });

  test('Lead and Safety Officer land on their own work queues', () => {
    expect(homeFor('event_coordinator_lead')).toBe('/coordinator-lead/queue');
    expect(homeFor('safety_officer')).toBe('/safety/queue');
    expect(roleLabel.event_coordinator_lead).toBe('Event Coordinator Lead');
    expect(roleLabel.safety_officer).toBe('Safety Officer');
  });
});
