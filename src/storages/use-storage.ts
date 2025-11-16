import type { BaseStorage } from './base'

interface StorageToken<T extends BaseStorage<any>> {
  prototype: T
}

type StorageInstance<Ctor> = Ctor extends StorageToken<infer T> ? T : never

const instances = new WeakMap<object, BaseStorage<any>>()

export function useStorage<Ctor extends StorageToken<BaseStorage<any>>>(CtorRef: Ctor): StorageInstance<Ctor> {
  const existing = instances.get(CtorRef)
  if (existing) {
    return existing as StorageInstance<Ctor>
  }

  const instance = Reflect.construct(
    CtorRef as unknown as new (...args: never[]) => BaseStorage<any>,
    []
  ) as StorageInstance<Ctor>
  instance.setup()
  instances.set(CtorRef, instance)
  return instance
}
