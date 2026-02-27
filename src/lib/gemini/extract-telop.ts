import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  GoogleAIFileManager,
  FileState,
} from "@google/generative-ai/server";

export type TelopEntry = {
  timestamp: string;
  text: string;
};

export type TelopResult = {
  telops: TelopEntry[];
  rawText: string;
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";

export async function extractTelopFromVideo(
  filePath: string,
  mimeType: string
): Promise<TelopResult> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

  // Upload video to Gemini File API
  const uploadResult = await fileManager.uploadFile(filePath, {
    mimeType,
    displayName: `telop-extract-${Date.now()}`,
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

  // Extract telops using Gemini model
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
      text: `この動画に表示されるテロップ（画面上のテキスト・字幕・タイトル）をすべて書き起こしてください。

以下のJSON形式で返してください（JSONのみ、他のテキストは不要）:
[
  {"timestamp": "MM:SS", "text": "テロップの内容"},
  ...
]

ルール:
- 動画内に表示されるすべてのテキストを時系列順に抽出
- タイムスタンプは表示開始時点の概算（MM:SS形式）
- 同時に表示される複数テロップは別エントリとして記載
- テロップが見つからない場合は空配列 [] を返す`,
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
  let telops: TelopEntry[] = [];
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        telops = parsed
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
  const rawText = telops.length > 0
    ? telops.map((t) => `[${t.timestamp}] ${t.text}`).join("\n")
    : text;

  return { telops, rawText };
}
