/**
 * Parse user API script metadata from header comments.
 *
 * Expected format:
 *   /*!
 *    * @name MySource
 *    * @description Some description
 *    * @version v1.0.0
 *    * @author Someone
 *    * /
 */

export interface UserApiMeta {
  name: string;
  description: string;
  version: string;
  author: string;
  rawScript: string;
}

const META_REGEX = /^\s*\*\s*@([\w-]+)\s+(.+)$/gm;

export function parseUserApiScript(script: string): UserApiMeta {
  const meta: Record<string, string> = {
    name: "",
    description: "",
    version: "",
    author: "",
  };

  let match: RegExpExecArray | null;
  while ((match = META_REGEX.exec(script)) !== null) {
    const rawKey = match[1].toLowerCase();
    if (rawKey in meta) {
      meta[rawKey as keyof typeof meta] = match[2].trim();
    }
  }

  return {
    name: meta.name,
    description: meta.description,
    version: meta.version,
    author: meta.author,
    rawScript: script,
  };
}
