// contexts/financial-tracking/domain/value-objects/note.ts
const MAX_NOTE_LENGTH = 500;

class Note {
  private constructor(private readonly value: string) {}

  static of(value: string): Note {
    const trimmed = value.trim();

    if (trimmed.length > MAX_NOTE_LENGTH) {
      throw new InvalidNoteError(`La observación no puede superar ${MAX_NOTE_LENGTH} caracteres`);
    }

    return new Note(trimmed);
  }

  toString(): string {
    return this.value;
  }

  equals(other: Note): boolean {
    return this.value === other.value;
  }
}

export { Note };