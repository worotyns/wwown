export class SerializableMap<T, R> extends Map<T, R> {
  // Get value or create temporary one and set them
  getOrSet(key: T, defaultValue: () => R): R {
    if (this.has(key)) {
      return this.get(key)!;
    } else {
      const value = defaultValue();
      this.set(key, value);
      return value;
    }
  }

  // Get value or create temporary one
  getOrMock(key: T, defaultValue: () => R): R {
    if (this.has(key)) {
      return this.get(key)!;
    } else {
      const value = defaultValue();
      return value;
    }
  }

  toJSON() {
    return Array.from(this);
  }
}
