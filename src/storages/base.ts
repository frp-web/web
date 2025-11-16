import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { debounce as _debounce, filter as _filter, kebabCase as _kebabCase, keys as _keys } from 'lodash-imports/lodash'

export abstract class BaseStorage<TSchema extends Record<string, any>> {
  private readonly _filePath: string
  private readonly _schedulePersist: () => void
  private readonly _reservedKeys: Set<string>
  private _cache: Partial<TSchema> = {}
  private _loaded = false
  private _initialized = false

  protected constructor() {
    const key = formatKey(this.constructor.name)
    const storageDir = resolveStorageDirectory()
    this._filePath = join(storageDir, `${key}.json`)
    this._schedulePersist = _debounce(() => {
      ensureDirectory(dirname(this._filePath))
      writeFileSync(this._filePath, JSON.stringify(this._cache, null, 2), 'utf8')
    }, 200)
    this._reservedKeys = new Set(Object.keys(this))
  }

  public setup() {
    if (this._initialized) {
      return
    }
    const fields = collectPublicFields(this, this._reservedKeys)
    for (const key of fields) {
      this._cache[key as keyof TSchema] = (this as any)[key]
      Reflect.deleteProperty(this, key)
      Object.defineProperty(this, key, {
        configurable: false,
        enumerable: true,
        get: () => this.read(key as keyof TSchema),
        set: (value: TSchema[keyof TSchema]) => {
          this.write(key as keyof TSchema, value)
        }
      })
    }
    this._initialized = true
  }

  private ensureLoaded() {
    if (this._loaded) {
      return
    }
    ensureDirectory(dirname(this._filePath))
    if (existsSync(this._filePath)) {
      try {
        const raw = readFileSync(this._filePath, 'utf8')
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<TSchema>
          Object.assign(this._cache, parsed)
        }
      }
      catch (error) {
        console.error(`[storage] Failed to read ${this._filePath}:`, error)
      }
    }
    this._loaded = true
  }

  private read(key: keyof TSchema) {
    this.ensureLoaded()
    return this._cache[key]
  }

  private write(key: keyof TSchema, value: TSchema[keyof TSchema]) {
    this.ensureLoaded()
    this._cache[key] = value
    this._schedulePersist()
  }
}

function collectPublicFields(instance: Record<string, any>, reserved: Set<string>) {
  return _filter(
    _keys(instance),
    (key: string) => !reserved.has(key) && !key.startsWith('_') && typeof instance[key] !== 'function'
  )
}

function formatKey(name: string) {
  return _kebabCase(name.replace(/Storage$/, ''))
}

function resolveStorageDirectory() {
  const explicit = process.env.FRP_WEB_STORAGE_DIR
  if (explicit) {
    ensureDirectory(explicit)
    return explicit
  }
  const workspace = process.env.FRP_BRIDGE_WORKDIR ?? resolve(process.cwd(), '.frp-web')
  ensureDirectory(workspace)
  const storagesDir = join(workspace, 'storages')
  ensureDirectory(storagesDir)
  return storagesDir
}

function ensureDirectory(pathname: string) {
  if (!existsSync(pathname)) {
    mkdirSync(pathname, { recursive: true })
  }
}
