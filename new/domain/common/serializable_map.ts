export class SerializableMap<T, R> extends Map<T, R> {
  getOrSet(key: T, defaultValue: () => R): R {
    if (this.has(key)) {
      return this.get(key)!;
    } else {
      const value = defaultValue();
      this.set(key, value);
      return value;
    }
  }

  toJSON() {
    return Array.from(this);
  }
}
