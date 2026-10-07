import { Pool } from 'pg';
import { requireMethod, sendJson } from '../../backend/src/http.js';
import type { VercelRequest, VercelResponse } from '../../backend/src/vercel.js';
import { registerAccount, type AccountInsert, type AccountRepository } from '../../backend/src/modules/accessControl/registration.js';
import { createAccountRepository } from '../../backend/src/modules/accessControl/postgresRepository.js';
import { sendVerificationEmail } from '../../backend/src/modules/accessControl/verificationEmail.js';
import { runtimeConfig, requireEnv } from '../../backend/src/config.js';

let pool: Pool | undefined;
function databasePool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
  return pool;
}
const repository: AccountRepository = {
  async createAttendee(input: AccountInsert) {
    return createAccountRepository(databasePool()).createAttendee(input);
  },
};

export function createRegistrationHandler(accounts: AccountRepository, poolFactory: () => Pool = databasePool) {
  return async (request: VercelRequest, response: VercelResponse) => {
    response.setHeader('cache-control', 'no-store');
    if (!requireMethod(request, response, 'POST')) return;
    try {
      const result = await registerAccount(request.body, accounts);
      if (result.status === 201 && result.body?.account) {
        // Verification email is a side-effect: if it fails we still keep the
        // account. The account can trigger a resend later (follow-up story).
        try {
          const appUrl = requireEnv(runtimeConfig.appUrl, 'APP_URL');
          await sendVerificationEmail({
            pool: poolFactory(),
            userId: result.body.account.id,
            appUrl,
          });
        } catch (emailError) {
          // Log to stderr but do not fail the registration response.
          // eslint-disable-next-line no-console
          console.error('verification_email_queue_failed', emailError);
        }
      }
      sendJson(response, result.status, result.body);
    } catch {
      sendJson(response, 500, { error: 'registration_failed', errors: {
        form: ['Unable to create your account. Please try again later.'],
      } });
    }
  };
}

export default createRegistrationHandler(repository);
