# LM動画システム / LM動画納品システム

## プロジェクト概要
LM動画システムとLM動画納品システムの2つのサブシステムで構成される。
サイドバーの切り替えUIで両システムを行き来できる（ADMINのみ）。

## 技術スタック
- Framework: Next.js 14
- DB: PostgreSQL / Prisma (Neon adapter)
- Auth: JWT (jose) + bcryptjs
- UI: Tailwind CSS + lucide-react
- 外部: Google Drive API, LINE Messaging API, Chatwork

## ディレクトリ構成（実際）
src/app/(authenticated)/
  admin/       ← 管理者画面（動画システム）
  creator/     ← クリエイター画面（動画システム）
  director/    ← ディレクター画面（動画システム）
  delivery/    ← LM動画納品システム（新規・ADMINのみ）

## 納品システム テーブル
- DeliveryClient: 納品先クライアント
- VideoStock: 動画ストックプール
- DeliverySchedule: 配信スケジュール (videoStockId UNIQUE = 1動画1納品先)
- DeliveryApproval: 承認記録
- DeliveryChangeLog: 変更ログ

## 色テーマ
- 動画システム: 紺色サイドバー + blue アクセント (CSS変数 default)
- 納品システム: teal サイドバー + teal アクセント (data-system="delivery")

## 重要ビジネスルール
- 1動画 = 1納品先（複数送付なし）
- 毎週第1営業日 10:12 に自動送信
- 祝日は翌営業日にスライド
- 管理者3名のうち1名承認でスケジュール確定
- 送信済みの週は変更不可・未送信分は管理者のみ変更可

## 環境変数（納品システム用）
- LINE_CHANNEL_ACCESS_TOKEN: LINE Messaging API
- CRON_SECRET: Vercel Cron認証
- GOOGLE_CALENDAR_ID: 配信スケジュール用Googleカレンダー（デフォルト: primary）
