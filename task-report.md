# Code Review Report - Web Realtime Handlers

## Scope

- `apps/web/lib/services/realtime-listeners.service.ts`
- `apps/web/lib/services/index.ts`
- `apps/web/lib/services/message.service.ts`
- `docs/requirements/web-realtime-handlers.md`

Existing unrelated workspace changes were left untouched.

## BLOCKER

None.

## WARNING

- Root `pnpm.cmd lint` still fails in existing `packages/shared-utils` lint issues.
- Root `pnpm.cmd typecheck` still fails in existing `apps/electron_client` `rootDir` errors.
- `pnpm.cmd --filter @c_chat/web lint` passes with an existing warning in `apps/web/app/chats/_components/LightboxImage.tsx` for raw `<img>` usage.

## NIT

None.

## Auto Fix

- Added a centralized Web realtime listener registrar.
- Registered every `ServiceToClientEvent` except `pong`, matching the Electron-side behavior.
- Kept concrete business handlers for error, ack send message, new update message, new conversation, and file upload complete.
- Left empty handlers for request/response events so `genericRequest` can decode and resolve responses.
- Routed `initializeRealtimeListeners()` through the centralized registrar to avoid scattered duplicate registrations.

## Checks

- `pnpm.cmd --filter @c_chat/web typecheck`: passed.
- `pnpm.cmd --filter @c_chat/web lint`: passed with existing `<img>` warning.
- `pnpm.cmd lint`: failed in existing `packages/shared-utils` lint issues.
- `pnpm.cmd typecheck`: failed in existing `apps/electron_client` `rootDir` errors.

## Conclusion

Current diff has no BLOCKER / WARNING / NIT findings after the automatic fixes.
