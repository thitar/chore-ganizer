import session from 'express-session'
import { prisma } from './prisma'

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000
const DEFAULT_SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000

export class PrismaSessionStore extends session.Store {
  private cleanupInterval?: NodeJS.Timeout

  constructor() {
    super()
    this.startCleanup()
  }

  get(sid: string, callback: (err: any, session?: session.SessionData | null) => void): void {
    prisma.session
      .findUnique({ where: { sid } })
      .then((row) => {
        if (!row || row.expires.getTime() <= Date.now()) {
          // Expired rows are left for pruneExpired(). Deleting here would race a
          // concurrent touch()/set() renewal: a request straddling the expiry
          // instant could destroy a just-renewed session (WR-01).
          callback(null, null)
          return
        }
        let parsed: session.SessionData
        try {
          parsed = JSON.parse(row.data) as session.SessionData
        } catch {
          // Corrupted row: remove it so the sid doesn't 500-loop forever. Scoping
          // the delete to the observed expires guards against deleting a row that
          // a concurrent set() just renewed with valid data.
          prisma.session.deleteMany({ where: { sid, expires: row.expires } }).catch(() => undefined)
          callback(null, null)
          return
        }
        callback(null, parsed)
      })
      .catch(callback)
  }

  set(sid: string, sessionData: session.SessionData, callback?: (err?: any) => void): void {
    const expires = sessionData.cookie?.expires ?? new Date(Date.now() + DEFAULT_SESSION_EXPIRY_MS)
    prisma.session
      .upsert({
        where: { sid },
        create: { sid, data: JSON.stringify(sessionData), expires },
        update: { data: JSON.stringify(sessionData), expires },
      })
      .then(() => callback?.())
      .catch(callback)
  }

  destroy(sid: string, callback?: (err?: any) => void): void {
    prisma.session
      .deleteMany({ where: { sid } })
      .then(() => callback?.())
      .catch(callback)
  }

  touch(sid: string, sessionData: session.SessionData, callback?: (err?: any) => void): void {
    const expires = sessionData.cookie?.expires ?? new Date(Date.now() + DEFAULT_SESSION_EXPIRY_MS)
    prisma.session
      .updateMany({ where: { sid }, data: { expires } })
      .then(() => callback?.())
      .catch((err) => {
        console.error('[session-store] touch failed for sid', sid, err)
        callback?.(err)
      })
  }

  all(callback: (err: any, obj?: session.SessionData[] | { [sid: string]: session.SessionData } | null) => void): void {
    prisma.session
      .findMany()
      .then((rows) => {
        const sessions: { [sid: string]: session.SessionData } = {}
        for (const row of rows) {
          if (row.expires.getTime() <= Date.now()) continue
          try {
            sessions[row.sid] = JSON.parse(row.data) as session.SessionData
          } catch {
            prisma.session.deleteMany({ where: { sid: row.sid, expires: row.expires } }).catch(() => undefined)
          }
        }
        callback(null, sessions)
      })
      .catch(callback)
  }

  length(callback: (err: any, length?: number) => void): void {
    prisma.session
      .count()
      .then((count) => callback(null, count))
      .catch(callback)
  }

  // Footgun: wipes every session row in the shared DB (all devices logged out).
  // Only reachable via req.sessionStore introspection — never call from route code.
  clear(callback?: (err?: any) => void): void {
    prisma.session
      .deleteMany({})
      .then(() => callback?.())
      .catch(callback)
  }

  async pruneExpired(): Promise<void> {
    await prisma.session.deleteMany({ where: { expires: { lt: new Date() } } })
  }

  private startCleanup(): void {
    const interval = setInterval(() => {
      this.pruneExpired().catch((err) => {
        console.error('[session-store] Failed to prune expired sessions:', err)
      })
    }, CLEANUP_INTERVAL_MS)
    if (typeof (interval as NodeJS.Timeout).unref === 'function') {
      interval.unref()
    }
  }
}
