"use client";

import { useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import {
  ChevronDown,
  ChevronRight,
  Monitor,
  Users,
  Film,
  CalendarDays,
  BarChart3,
  LayoutDashboard,
  FileText,
  Link2,
  Send,
  HelpCircle,
  Zap,
  Settings,
  BookOpen,
} from "lucide-react";

type Section = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
};

function SectionCard({
  section,
  isOpen,
  onToggle,
}: {
  section: Section;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const Icon = section.icon;
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <Icon className="h-5 w-5 text-teal-600 flex-shrink-0" />
        <span className="text-base font-semibold text-gray-900 flex-1">
          {section.title}
        </span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="border-t border-gray-100 px-5 py-4 prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-li:text-gray-600 prose-strong:text-gray-800 prose-td:text-gray-600 prose-th:text-gray-700">
          {section.content}
        </div>
      )}
    </div>
  );
}

function StatusFlow() {
  const steps = [
    { label: "下書き", color: "bg-gray-100 text-gray-600", desc: "DRAFT" },
    { label: "承認待ち", color: "bg-yellow-100 text-yellow-800", desc: "PENDING_APPROVAL" },
    { label: "承認済み", color: "bg-green-100 text-green-800", desc: "APPROVED" },
    { label: "送信済み", color: "bg-blue-100 text-blue-800", desc: "SENT" },
  ];
  return (
    <div className="flex items-center gap-2 flex-wrap my-3">
      {steps.map((step, i) => (
        <div key={step.desc} className="flex items-center gap-2">
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${step.color}`}>
            {step.label}
          </span>
          {i < steps.length - 1 && (
            <span className="text-gray-300">→</span>
          )}
        </div>
      ))}
    </div>
  );
}

function InfoTable({ rows }: { rows: [string, string][] }) {
  return (
    <table className="w-full text-sm border-collapse my-3">
      <tbody>
        {rows.map(([key, val], i) => (
          <tr key={i} className="border-b border-gray-100">
            <td className="py-2 pr-4 font-medium text-gray-700 whitespace-nowrap w-40">{key}</td>
            <td className="py-2 text-gray-600">{val}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const sections: Section[] = [
  {
    id: "overview",
    title: "システム概要",
    icon: Monitor,
    content: (
      <div>
        <p>
          LM動画納品システムは、<strong>動画制作の完了後からクライアントへの納品まで</strong>を管理するシステムです。
        </p>
        <div className="my-4 rounded-lg bg-teal-50 border border-teal-200 px-4 py-3">
          <p className="text-sm text-teal-800 font-medium mb-1">基本フロー</p>
          <p className="text-sm text-teal-700">
            動画完了 → ストック蓄積 → スケジュール作成 → 承認 → 自動送信
          </p>
        </div>
        <h4 className="font-semibold mt-4 mb-2">主な機能</h4>
        <InfoTable
          rows={[
            ["クライアント管理", "納品先クライアントの登録・契約管理"],
            ["動画ストック管理", "納品可能な動画の在庫プール管理"],
            ["配信スケジュール", "いつ・誰に・何を送るかの計画管理"],
            ["月次配分", "月間の過不足を可視化し、自動振り分け"],
            ["自動送信", "毎週月曜10:12に承認済みスケジュールを自動送信"],
          ]}
        />
        <h4 className="font-semibold mt-4 mb-2">ユーザー権限</h4>
        <p>納品システムは <strong>ADMIN（管理者）のみ</strong> がアクセスできます。左サイドバー下部の「納品システム」切り替えボタンで移動します。</p>
      </div>
    ),
  },
  {
    id: "tags",
    title: "動画の分類タグ（納品区分・メニューカテゴリ）",
    icon: BookOpen,
    content: (
      <div>
        <p>動画には2つの分類タグが付きます。いずれも動画システムで最終承認する際に<strong>必須入力</strong>です。</p>

        <h4 className="font-semibold mt-4 mb-2">納品区分</h4>
        <InfoTable
          rows={[
            ["全店舗用", "どのクライアントにも送れる汎用動画。自動振り分け時に不足が多いクライアントから優先割当"],
            ["店舗選択", "特定のクライアント専用の動画。指定クライアントにのみ割当"],
          ]}
        />

        <h4 className="font-semibold mt-4 mb-2">メニューカテゴリ</h4>
        <InfoTable
          rows={[
            ["毛穴洗浄", "PORE_CLEANSING"],
            ["肌質改善", "SKIN_IMPROVEMENT"],
            ["ワックス", "WAX"],
            ["ピーリング", "PEELING"],
            ["その他", "OTHER（コメント入力必須）"],
          ]}
        />
      </div>
    ),
  },
  {
    id: "clients",
    title: "クライアント管理の使い方",
    icon: Users,
    content: (
      <div>
        <p>サイドバー → <strong>クライアント管理</strong> で開きます。</p>

        <h4 className="font-semibold mt-4 mb-2">新規作成</h4>
        <ol className="list-decimal list-inside space-y-1">
          <li>画面右上の<strong>「新規クライアント」</strong>ボタンをクリック</li>
          <li>基本情報（クライアント名は必須）、契約情報、連携設定を入力</li>
          <li><strong>「作成」</strong>をクリック</li>
        </ol>

        <h4 className="font-semibold mt-4 mb-2">重要な設定項目</h4>
        <InfoTable
          rows={[
            ["月の納品本数", "この値が月間目標になります（デフォルト: 1本/月）"],
            ["契約開始日 + 契約期間", "セットで入力すると終了日が自動計算されます"],
            ["LINEグループID", "設定すると自動送信時にLINE通知が届きます"],
            ["Google DriveフォルダID", "動画ファイルのコピー先。未設定でも自動作成されます"],
          ]}
        />

        <h4 className="font-semibold mt-4 mb-2">契約更新</h4>
        <p>テーブルの<strong>更新アイコン（循環矢印）</strong>→ 更新期間を選択 → <strong>「契約を更新する」</strong></p>

        <h4 className="font-semibold mt-4 mb-2">契約アラート</h4>
        <p>画面上部に赤バナー（契約満了）や黄バナー（30日以内に満了）が自動表示されます。</p>
      </div>
    ),
  },
  {
    id: "stocks",
    title: "動画ストック管理の使い方",
    icon: Film,
    content: (
      <div>
        <p>サイドバー → <strong>動画ストック</strong> で開きます。</p>

        <h4 className="font-semibold mt-4 mb-2">ストックの追加方法</h4>
        <InfoTable
          rows={[
            ["自動追加", "動画システムで動画が「完了」になると自動でストックに追加されます"],
            ["手動追加", "「新規ストック」ボタンから手動で登録できます"],
          ]}
        />

        <h4 className="font-semibold mt-4 mb-2">テーブルの列</h4>
        <InfoTable
          rows={[
            ["タイトル / ファイル名", "動画の基本情報"],
            ["納品区分", "全店舗用（青）or 店舗選択（黄）。鉛筆アイコンで編集可能"],
            ["メニュー", "メニューカテゴリ（teal色バッジ）"],
            ["連携元", "動画システムからの自動連携は案件コード表示、手動は「手動登録」"],
            ["クライアント", "割当先。鉛筆アイコンで変更可能"],
            ["ステータス", "未使用（緑）or 使用済み（灰色）"],
          ]}
        />

        <h4 className="font-semibold mt-4 mb-2">インライン編集</h4>
        <p>テーブル上の<strong>鉛筆アイコン</strong>をクリック → 値を変更 → <strong>チェックマーク</strong>で保存。「納品区分」と「クライアント」が編集できます。</p>

        <h4 className="font-semibold mt-4 mb-2">注意</h4>
        <p>使用済み（配信に使われた）ストックは削除できません。</p>
      </div>
    ),
  },
  {
    id: "schedules",
    title: "配信スケジュールの使い方",
    icon: CalendarDays,
    content: (
      <div>
        <p>サイドバー → <strong>配信スケジュール</strong> で開きます。</p>

        <h4 className="font-semibold mt-4 mb-2">ステータスフロー</h4>
        <StatusFlow />

        <h4 className="font-semibold mt-4 mb-2">個別作成</h4>
        <ol className="list-decimal list-inside space-y-1">
          <li><strong>「新規スケジュール」</strong>をクリック</li>
          <li>クライアント、動画（未使用ストック）、配信週（月曜日）を選択</li>
          <li><strong>「作成」</strong>→ DRAFTで作成される</li>
        </ol>

        <h4 className="font-semibold mt-4 mb-2">一括作成</h4>
        <ol className="list-decimal list-inside space-y-1">
          <li><strong>「一括作成」</strong>をクリック</li>
          <li>配信週を選択</li>
          <li>クライアント・動画ペアを行ごとに入力（「行を追加」で増やせる）</li>
          <li><strong>「N件を一括作成」</strong>をクリック</li>
        </ol>

        <h4 className="font-semibold mt-4 mb-2">ステータス別の操作</h4>
        <InfoTable
          rows={[
            ["DRAFT", "「承認申請」「編集」「削除」が可能"],
            ["承認待ち", "「承認」「編集」「削除」が可能"],
            ["承認済み", "「手動送信」「編集」「削除」が可能"],
            ["送信済み", "操作不可（変更できません）"],
          ]}
        />

        <h4 className="font-semibold mt-4 mb-2">承認</h4>
        <p>管理者3名のうち<strong>1名が「承認」ボタンを押すだけ</strong>で確定します。承認するとGoogleカレンダーにイベントが自動登録されます。</p>
      </div>
    ),
  },
  {
    id: "distribution",
    title: "月次配分ダッシュボードの使い方",
    icon: BarChart3,
    content: (
      <div>
        <p>サイドバー → <strong>月次配分</strong> で開きます。月単位で各クライアントの過不足状況を可視化します。</p>

        <h4 className="font-semibold mt-4 mb-2">サマリーカード</h4>
        <InfoTable
          rows={[
            ["月間目標", "全クライアントの月間目標合計"],
            ["配信済み", "今月送信済みの合計"],
            ["予定済み", "DRAFT〜APPROVEDのスケジュール合計"],
            ["不足", "目標 - 配信済み - 予定済み"],
          ]}
        />

        <h4 className="font-semibold mt-4 mb-2">在庫プール</h4>
        <InfoTable
          rows={[
            ["全店舗用", "「全店舗用」タグの未使用ストック数"],
            ["未割当", "タグ未設定、またはクライアント未指定のストック数"],
            ["合計未使用", "全ての未使用ストック数"],
          ]}
        />

        <h4 className="font-semibold mt-4 mb-2">自動振り分け</h4>
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 my-3">
          <p className="text-sm text-amber-800">
            <strong>「自動振り分け」</strong>ボタンをクリックすると、不足クライアントに在庫を自動で割り当て、<strong>DRAFT（下書き）</strong>スケジュールとして作成されます。
          </p>
        </div>
        <p className="text-sm"><strong>優先順位:</strong></p>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>店舗選択ストック → 該当クライアントに優先割当</li>
          <li>全店舗用ストック → 不足数が最も多いクライアントから順に割当</li>
          <li>未割当ストック → 残りの不足クライアントに割当</li>
        </ol>
        <p className="text-sm mt-2">各週に均等に配分されるよう自動バランス調整されます。</p>
      </div>
    ),
  },
  {
    id: "dashboard",
    title: "納品ダッシュボードの使い方",
    icon: LayoutDashboard,
    content: (
      <div>
        <p>サイドバー → <strong>ダッシュボード</strong> で開きます。今週の納品状況が一目でわかります。</p>

        <h4 className="font-semibold mt-4 mb-2">サマリーカード</h4>
        <InfoTable
          rows={[
            ["アクティブクライアント", "有効なクライアント数"],
            ["未使用ストック", "使用可能なストック数 / 全ストック数"],
            ["承認待ち", "DRAFT + 承認待ちのスケジュール数"],
            ["送信済み", "全期間の送信済み数"],
          ]}
        />

        <h4 className="font-semibold mt-4 mb-2">今週の納品スケジュール</h4>
        <p>クライアントごとに今週何本納品するか、動画名、ステータスが表示されます。</p>
        <p>スケジュールがないクライアントも<strong>「未登録」</strong>として表示されるので、漏れに気づけます。</p>
      </div>
    ),
  },
  {
    id: "logs",
    title: "変更ログの見方",
    icon: FileText,
    content: (
      <div>
        <p>サイドバー → <strong>変更ログ</strong> で開きます。</p>
        <p>納品システムで行われた全ての操作履歴が確認できます。</p>
        <InfoTable
          rows={[
            ["作成（緑）", "スケジュールの新規作成"],
            ["更新（黄）", "スケジュールの変更"],
            ["削除（赤）", "スケジュールの削除"],
            ["承認（青）", "スケジュールの承認"],
            ["送信（紫）", "動画の送信"],
          ]}
        />
        <p>50件/ページのページネーション対応です。</p>
      </div>
    ),
  },
  {
    id: "sync",
    title: "動画システムとの連携",
    icon: Link2,
    content: (
      <div>
        <p>動画システムとの連携は<strong>自動</strong>で行われます。手動操作は不要です。</p>

        <div className="rounded-lg bg-teal-50 border border-teal-200 px-4 py-3 my-3">
          <p className="text-sm text-teal-800">
            <strong>管理者が動画を最終承認（COMPLETED）</strong>すると、自動的にVideoStock（動画ストック）が作成されます。
          </p>
        </div>

        <h4 className="font-semibold mt-4 mb-2">承認時の必須入力</h4>
        <ol className="list-decimal list-inside space-y-1">
          <li>納品区分（全店舗用 or 店舗選択 → 店舗をプルダウンで選択）</li>
          <li>メニューカテゴリ（毛穴洗浄 / 肌質改善 / ワックス / ピーリング / その他）</li>
        </ol>

        <h4 className="font-semibold mt-4 mb-2">同期タイミング</h4>
        <InfoTable
          rows={[
            ["動画をCOMPLETEDにする", "VideoStockが新規作成される"],
            ["完了一覧で納品区分を変更", "VideoStockのdeliveryScopeが更新される"],
            ["完了一覧でメニューカテゴリを変更", "VideoStockのmenuCategoryが更新される"],
          ]}
        />
      </div>
    ),
  },
  {
    id: "auto-send",
    title: "自動送信の仕組み",
    icon: Send,
    content: (
      <div>
        <h4 className="font-semibold mb-2">全体の流れ</h4>
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 my-3 text-sm font-mono">
          <p>毎日 10:12 JST に Vercel Cron が起動</p>
          <p className="ml-4">├ Step 1: 承認済みスケジュールに送信日時を設定</p>
          <p className="ml-4">└ Step 2: 送信日時が過ぎたスケジュールを送信</p>
        </div>

        <h4 className="font-semibold mt-4 mb-2">「第1営業日」とは</h4>
        <p>月曜日が平日ならその日、祝日なら翌営業日にスライドします。土日祝を自動判定しています（ハッピーマンデー・振替休日・春分/秋分も対応）。</p>

        <h4 className="font-semibold mt-4 mb-2">送信時の処理</h4>
        <ol className="list-decimal list-inside space-y-1">
          <li><strong>Google Drive:</strong> 動画ファイルをクライアント別フォルダにコピー</li>
          <li><strong>LINE:</strong> クライアントのLINEグループに通知メッセージを送信</li>
          <li><strong>DB更新:</strong> ステータス → SENT、ストック → 使用済み</li>
          <li><strong>Googleカレンダー:</strong> イベントを送信済みに更新</li>
        </ol>

        <h4 className="font-semibold mt-4 mb-2">LINE通知メッセージ例</h4>
        <div className="rounded bg-gray-100 px-4 py-3 text-sm whitespace-pre-line font-mono my-3">
{`【動画納品のお知らせ】

横浜店 様

下記の動画を納品いたしました。

■ 動画タイトル
夏のスキンケア動画

■ 動画リンク
https://drive.google.com/...

ご確認のほど、よろしくお願いいたします。`}
        </div>
      </div>
    ),
  },
  {
    id: "workflow",
    title: "月間の運用フロー",
    icon: Zap,
    content: (
      <div>
        <h4 className="font-semibold mb-2">月初</h4>
        <ol className="list-decimal list-inside space-y-1">
          <li><strong>月次配分ダッシュボード</strong>を開き、今月の過不足を確認</li>
          <li>不足があり在庫があれば<strong>「自動振り分け」</strong>を実行</li>
          <li>作成されたDRAFTスケジュールの内容を確認</li>
          <li>問題なければ各スケジュールに<strong>「承認申請」→「承認」</strong></li>
        </ol>

        <h4 className="font-semibold mt-4 mb-2">月中</h4>
        <ol className="list-decimal list-inside space-y-1" start={5}>
          <li>動画システムで完了した動画が<strong>自動</strong>でストックに追加される</li>
          <li>新しいストックが増えたら、再度月次配分を確認</li>
          <li>追加の振り分けが必要なら手動 or 再度自動振り分け</li>
        </ol>

        <h4 className="font-semibold mt-4 mb-2">毎週月曜（自動）</h4>
        <ol className="list-decimal list-inside space-y-1" start={8}>
          <li>Cronジョブが承認済みスケジュールを<strong>自動送信</strong></li>
          <li>Google Driveにファイルコピー + LINEグループに通知</li>
          <li>ダッシュボードで送信結果を確認</li>
        </ol>

        <h4 className="font-semibold mt-4 mb-2">月末</h4>
        <ol className="list-decimal list-inside space-y-1" start={11}>
          <li>月次配分ダッシュボードで<strong>達成状況</strong>を確認</li>
          <li>変更ログで月間の操作履歴を振り返り</li>
          <li>クライアント管理で<strong>契約満了アラート</strong>をチェック</li>
        </ol>
      </div>
    ),
  },
  {
    id: "troubleshooting",
    title: "トラブルシューティング",
    icon: HelpCircle,
    content: (
      <div>
        <h4 className="font-semibold mb-2">スケジュールが自動送信されない</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>ステータスが<strong>APPROVED</strong>になっているか確認</li>
          <li>配信週が過去の日付になっているか確認</li>
          <li>対処: 配信スケジュール画面の<strong>「手動送信」</strong>ボタンで送信可能</li>
        </ul>

        <h4 className="font-semibold mt-4 mb-2">ストックに動画が自動追加されない</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>動画のステータスが本当に<strong>COMPLETED</strong>か確認</li>
          <li>承認時に納品区分・メニューカテゴリを入力したか確認</li>
          <li>対処: 動画ストック管理の<strong>「新規ストック」</strong>から手動登録</li>
        </ul>

        <h4 className="font-semibold mt-4 mb-2">LINE通知が届かない</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>クライアントに<strong>LINEグループID</strong>が設定されているか確認</li>
          <li>LINE Botがグループに招待されているか確認</li>
          <li>LINE送信失敗でもスケジュール自体はSENTになります</li>
        </ul>

        <h4 className="font-semibold mt-4 mb-2">自動振り分けで「割り当て可能なストックがありません」</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>未使用かつスケジュール未割当のストックが0本</li>
          <li>対処: 動画システムで新しい動画を完了にするか、手動でストックを登録</li>
        </ul>
      </div>
    ),
  },
  {
    id: "architecture",
    title: "システム構成（技術情報）",
    icon: Settings,
    content: (
      <div>
        <h4 className="font-semibold mb-2">技術スタック</h4>
        <InfoTable
          rows={[
            ["Next.js 14", "フロントエンド + API"],
            ["PostgreSQL (Neon)", "データベース"],
            ["Prisma ORM", "DB操作"],
            ["Vercel", "ホスティング + Cron"],
            ["Google Drive API", "動画ファイルの管理・コピー"],
            ["LINE Messaging API", "クライアントへの納品通知"],
            ["Google Calendar API", "配信スケジュールの可視化"],
          ]}
        />

        <h4 className="font-semibold mt-4 mb-2">データの関係</h4>
        <div className="rounded bg-gray-100 px-4 py-3 text-sm font-mono my-3 whitespace-pre">
{`Video (動画システム)
  │  COMPLETED時に自動作成（1:1）
  ▼
VideoStock (動画ストック)
  │  1つのストック = 1つのスケジュール
  ▼
DeliverySchedule (配信スケジュール)
  ├── DeliveryApproval (承認記録)
  └── DeliveryChangeLog (変更ログ)

DeliveryClient (クライアント)
  └── VideoStock / DeliverySchedule と紐付き`}
        </div>

        <h4 className="font-semibold mt-4 mb-2">重要なビジネスルール</h4>
        <InfoTable
          rows={[
            ["1動画 = 1納品先", "1つのストックは1つのクライアントにしか送れません"],
            ["毎週第1営業日に自動送信", "10:12 JST。祝日は翌営業日にスライド"],
            ["管理者1名承認で確定", "管理者3名のうち1名が承認すればOK"],
            ["送信済みは変更不可", "SENTのスケジュールは編集・削除できません"],
          ]}
        />
      </div>
    ),
  },
];

export default function DeliveryManualPage() {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["overview"]));

  function toggle(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setOpenSections(new Set(sections.map((s) => s.id)));
  }

  function collapseAll() {
    setOpenSections(new Set());
  }

  return (
    <PageContainer title="操作マニュアル">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          LM動画納品システムの使い方をセクションごとに確認できます。
        </p>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="text-xs text-teal-600 hover:text-teal-800 font-medium"
          >
            すべて開く
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={collapseAll}
            className="text-xs text-gray-500 hover:text-gray-700 font-medium"
          >
            すべて閉じる
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {sections.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            isOpen={openSections.has(section.id)}
            onToggle={() => toggle(section.id)}
          />
        ))}
      </div>
    </PageContainer>
  );
}
