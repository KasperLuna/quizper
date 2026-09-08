import { z } from "zod";

import type { Answer } from "./quiz";

/**
 * Codec for /results?s= URLs. Encodes Answer[] + score as base64url JSON.
 * decodeShare validates shape and never throws — returns null on any
 * malformed input. Never trust the decoded score: callers must re-verify
 * answers server-side (POST /api/attempts recomputes from quiz content).
 */

const answerSchema = z.object({
  questionId: z.string().min(1),
  choice: z.number().int().min(0),
});

const sharePayloadSchema = z.object({
  answers: z.array(answerSchema),
  score: z.number().int().min(0).max(100),
});

export interface SharePayload {
  answers: Answer[];
  score: number;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const padded = s.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function encodeShare(payload: SharePayload): string {
  const parsed = sharePayloadSchema.parse(payload);
  return toBase64Url(new TextEncoder().encode(JSON.stringify(parsed)));
}

export function decodeShare(s: string): SharePayload | null {
  try {
    if (!s || s.length > 8192) return null;
    const json = new TextDecoder().decode(fromBase64Url(s));
    const parsed = sharePayloadSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
