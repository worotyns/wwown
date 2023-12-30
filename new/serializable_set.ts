export class SerializableSet<T> extends Set<T> {
  getOrSet(key: T, defaultValue: () => T): T {
    if (this.has(key)) {
      return key;
    } else {
      const value = defaultValue();
      this.add(value);
      return value;
    }
  }
  toJSON() {
    return Array.from(this);
  }
}
