declare module 'connect-sqlite3' {
  import expressSession from 'express-session'
  
  interface SQLiteStoreOptions {
    db?: string
    dir?: string
    table?: string
  }
  
  const SQLiteStore: {
    (session: typeof expressSession): new (options?: SQLiteStoreOptions) => expressSession.Store
  }
  
  export = SQLiteStore
}