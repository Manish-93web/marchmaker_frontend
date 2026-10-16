/** A translation may leave out any key; missing ones fall back to English, so a new English string never breaks Hindi. */
export type DeepPartial<T> = T extends readonly (infer U)[] ? DeepPartial<U>[] : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;
