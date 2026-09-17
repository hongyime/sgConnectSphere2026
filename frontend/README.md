# Frontend

React + Vite browser application scaffold for the ConnectSphere operations UI.

## Commands

Run from the repository root:

```text
npm install
npm run dev
npm run typecheck --workspace frontend
npm run build --workspace frontend
```

The current UI is the SG ConnectSphere Release 1 application shell. It opens on
the first working request-to-submit slice, with the full screen map retained as
reference coverage across desktop and mobile companion layouts.

Use the `Request flow` switch to review the organiser create-request path:
validate mandatory fields, save draft, and submit with a mock status timeline.
Use `Screen map` only when checking planned role coverage against the source
documents and Figma plan.

Keep server-only credentials out of frontend code. Browser-safe values should use
the public names documented in `.env.template`.
