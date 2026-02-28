import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  GoogleAIFileManager,
  FileState,
} from "@google/generative-ai/server";

export type AudioEntry = {
  timestamp: string;
  text: string;
};

export type AudioResult = {
  entries: AudioEntry[];
  rawText: string;
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";

export async function extractAudioFromVideo(
  fileData: string | Buffer,
  mimeType: string
): Promise<AudioResult> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

  // Upload video to Gemini File API (SDK accepts string path or Buffer)
  const uploadResult = await fileManager.uploadFile(fileData, {
    mimeType,
    displayName: `audio-extract-${Date.now()}`,
  });

  let file = uploadResult.file;

  // Poll until processing is complete
  while (file.state === FileState.PROCESSING) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    file = await fileManager.getFile(file.name);
  }

  if (file.state === FileState.FAILED) {
    throw new Error("Gemini file processing failed");
  }

  // Extract audio transcription using Gemini model
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent([
    {
      fileData: {
        mimeType: file.mimeType,
        fileUri: file.uri,
      },
    },
    {
      text: `この動画の音声（ナレーション・会話・セリフ）をすべて書き起こしてください。BGM・効果音・環境音は無視してください。

以下のJSON形式で返してください（JSONのみ、他のテキストは不要）:
[
  {"timestamp": "MM:SS", "text": "発話内容"},
  ...
]

ルール:
- 動画内の音声・ナレーション・会話をすべて時系列順に書き起こし
- タイムスタンプは発話開始時点の概算（MM:SS形式）
- 話者が変わる場合は別エントリとして記載
- 音声が聞き取れない場合は空配列 [] を返す`,
    },
  ]);

  // Clean up uploaded file
  try {
    await fileManager.deleteFile(file.name);
  } catch {
    // Ignore cleanup errors
  }

  const text = result.response.text();

  // Parse JSON from response
  let entries: AudioEntry[] = [];
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        entries = parsed
          .filter(
            (item: unknown): item is Record<string, unknown> =>
              typeof item === "object" &&
              item !== null &&
              "timestamp" in item &&
              "text" in item
          )
          .map((item) => ({
            timestamp: String(item.timestamp),
            text: String(item.text),
          }));
      }
    }
  } catch {
    // If parsing fails, return empty with raw text
  }

  // Build readable text representation
  const rawText = entries.length > 0
    ? entries.map((e) => `[${e.timestamp}] ${e.text}`).join("\n")
    : text;

  return { entries, rawText };
}
