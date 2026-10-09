const DB_NAME = 'snap-and-study-db'
const STORE_NAME = 'studySessions'
const DB_VERSION = 1

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Your browser does not support local study storage.'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
        })

        store.createIndex('createdAt', 'createdAt')
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveStudySession(session) {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')

    transaction.objectStore(STORE_NAME).put({
      ...session,
      updatedAt: new Date().toISOString(),
    })

    transaction.oncomplete = () => {
      db.close()
      resolve(true)
    }

    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }

    transaction.onabort = () => {
      db.close()
      reject(transaction.error || new Error('Saving was cancelled.'))
    }
  })
}

export async function getStudySessions() {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).getAll()

    request.onsuccess = () => {
      const sessions = request.result.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )
      resolve(sessions)
    }

    request.onerror = () => reject(request.error)

    transaction.oncomplete = () => db.close()
    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

export async function deleteStudySession(id) {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(id)

    transaction.oncomplete = () => {
      db.close()
      resolve(true)
    }

    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

export async function clearStudyHistory() {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).clear()

    transaction.oncomplete = () => {
      db.close()
      resolve(true)
    }

    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
  })
}