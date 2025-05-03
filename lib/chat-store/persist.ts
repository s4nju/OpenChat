import Dexie, { type Table } from "dexie"

// Define interfaces for the data structures. Assuming basic structure with 'id'.
// Ideally, these would be imported from a central types definition file.
interface BaseRecord {
  id: string | number
  // other properties...
}

// Define the database structure using Dexie
class OpenChatDB extends Dexie {
  // Define tables (object stores)
  chats!: Table<BaseRecord, string> // Primary key type is string
  messages!: Table<BaseRecord, string>
  sync!: Table<BaseRecord, string>

  constructor() {
    super("openchat-db") // Database name
    // Define schema version 2 (incremented from 1)
    // 'id' is the primary key for each table
    this.version(1).stores({
      chats: "id",
      messages: "id",
      sync: "id",
    })
    // Future schema upgrades would go here, incrementing the version number.
    // Example:
    // this.version(2).stores({
    //   chats: "id, someOtherIndex", // Add an index
    //   messages: "id",
    //   sync: "id",
    // });
  }
}

const isClient = typeof window !== "undefined"

// Instantiate the database if on the client side
const db = isClient ? new OpenChatDB() : (null as any as OpenChatDB) // Type assertion for SSR safety

// Helper function to ensure operation only runs on the client with a valid DB instance
async function ensureClientDb(): Promise<boolean> {
  if (!isClient || !db) {
    console.warn("IndexedDB operation skipped: Not running in client environment or DB not initialized.")
    return false
  }
  // Dexie handles DB opening automatically, but we can wait for it explicitly if needed,
  // though most operations implicitly wait.
  try {
    await db.open() // Ensures the DB is open before proceeding
    return true
  } catch (error) {
    console.error("Failed to open Dexie database:", error)
    return false
  }
}

// Type definition for table names
type TableName = "chats" | "messages" | "sync"

export async function readFromIndexedDB<T extends BaseRecord>(
  table: TableName,
  key?: string
): Promise<T | T[] | null> {
  if (!(await ensureClientDb())) {
    return key ? null : []
  }

  try {
    const dexieTable = db.table(table) as Table<T, string>
    if (key) {
      const result = await dexieTable.get(key)
      return result ?? null // Return null if not found, consistent with previous potential behavior
    } else {
      const results = await dexieTable.toArray()
      return results
    }
  } catch (error) {
    console.warn(`readFromIndexedDB failed (${table}):`, error)
    return key ? null : []
  }
}

export async function writeToIndexedDB<T extends BaseRecord>(
  table: TableName,
  data: T | T[]
): Promise<void> {
  if (!(await ensureClientDb())) {
    return
  }

  try {
    const dexieTable = db.table(table) as Table<T, string>
    if (Array.isArray(data)) {
      // Use bulkPut for arrays
      await dexieTable.bulkPut(data)
    } else {
      // Use put for single items (adds or updates)
      await dexieTable.put(data)
    }
  } catch (error) {
    console.warn(`writeToIndexedDB failed (${table}):`, error)
  }
}

export async function deleteFromIndexedDB(
  table: TableName,
  key?: string
): Promise<void> {
  if (!(await ensureClientDb())) {
    return
  }

  try {
    const dexieTable = db.table(table) as Table<any, string> // Use 'any' if type T isn't needed
    if (key) {
      // Delete a single item by key
      await dexieTable.delete(key)
    } else {
      // Clear the entire table if no key is provided
      await dexieTable.clear()
    }
  } catch (error) {
    console.warn(`deleteFromIndexedDB failed (${table}):`, error)
  }
}

export async function clearAllIndexedDBStores(): Promise<void> {
  if (!(await ensureClientDb())) {
    return
  }

  try {
    // Clear all defined tables transactionally
    await db.transaction("rw", db.chats, db.messages, db.sync, async () => {
      await db.chats.clear()
      await db.messages.clear()
      await db.sync.clear()
    })
    console.log("All IndexedDB stores cleared.")
  } catch (error) {
    console.error("clearAllIndexedDBStores failed:", error)
  }
}

// Export the db instance if needed elsewhere (optional)
// export { db };// Removed old idb-keyval related code:
// - createStore, del, delMany, get, getMany, keys, set, setMany imports
// - DB_VERSION constant (Dexie manages its own versions)
// - dbInitPromise, stores, storesReady, storesReadyResolve, storesReadyPromise
// - initDatabase, initDatabaseAndStores functions
// - ensureDbReady function (replaced with ensureClientDb and Dexie's internal handling)
// The complex initialization logic is replaced by Dexie's constructor and .open()

