# task.md — カーテンコール 開発タスクリスト

> **仕様整合元**: rulebook.md / base_spec.md / specs配下の各種spec(0.HOME_spec.md, 1.standby_spec.md, 2.scout_spec.md, 3.action_spec.md, 4.spotlight_spec.md, 5.watch_spec.md, 6.intermission_spec.md, 7.curtaincall_spec.md)
> **原則**: 1タスク=1ブランチ=最小粒度。UI要素・イベント・状態・遷移・ガード・表示文言・AC(受け入れ基準)まで明記。  
> **進捗報告タスク**も通し番号に統一。章の冒頭に配置し「開始宣言／終了報告／次の予定共有」を行う（コーディング不要）。

---

## 0. プロジェクト基盤

### 進捗レポート
| No | branchName | 概要 | 詳細 | 備考 |
|---:|---|---|---|---|
| 0 | chore/report-foundation | 基盤章の開始/終了レポート | 開始時:「#0着手（1–9）」／終了時:「#0完了→#1 HOMEへ」。予定・リスク共有。 | コーディング不要 |

### 実装
| No | branchName | 概要 | 詳細 | 参照 |
|---:|---|---|---|---|
| 1 | chore/scaffold | プロジェクト初期化 | index.html／src/app.ts, router.ts, state.ts／UIコンポ骨格。Lint/Prettier導入。 | base_spec.md |
| 2 | feat/router-hash | ハッシュルータ | `/#/`HOME〜`/#/resume/gate`まで。未知→HOMEへ。`router.go`実装。 | base_spec.md |
| 3 | feat/state-model | 状態定義 | Player, Card, Stage, Hand, Turn, Phaseなど型とstore実装。 | base_spec.md |
| 4 | feat/deck-build | デッキ配布 | 53枚生成→シャッフル→set13／手札20×2。重複なし保証。 | base_spec.md |
| 5 | feat/rank-value | ランク関数 | A=1, J=11, Q=12, K=13, Joker=0。将来切替可。 | rulebook.md |
| 6 | feat/persist-store | 永続化基盤 | localStorage API。resume/gate以外からの復元は禁止。 | base_spec.md |
| 7 | feat/ui-core | UIコンポ | Button/Modal/Toast/Cardなど共通。連打ロック実装。 | 共通 |
| 8 | feat/modal-gate | 全画面ゲート | OK押下でonGatePass。秘匿要素をゲート前非描画。 |各spec|
| 9 | feat/modal-boardcheck | ボードチェック | セット/ステージ/スコアタブ。公開情報のみ表示。 |各spec|

---

## 1. HOME

### 進捗レポート
| No | branchName | 概要 | 詳細 | 備考 |
|---:|---|---|---|---|
| 10 | chore/report-home | HOME章レポート | 着手「11–14」／終了時「#2スタンバイ(20–23)へ」。 | コーディング不要 |

### 実装
| No | branchName | 概要 | 詳細 | 参照 |
|---:|---|---|---|---|
| 11 | feat/home-structure | HOME骨格 | main/h1/ボタン群。ボタン4種：開始/続き/設定/ヘルプ。 | base_spec.md |
| 12 | feat/home-actions | ボタン挙動 | 開始→standby／続き→resume/gate／設定→dialog／ヘルプ→rulebook新規タブ。 | base_spec.md |
| 13 | feat/home-resume-shortcut | 続きから制御 | セーブ無→ボタン非活性。セーブ日時を小表示。 | base_spec.md |
| 14 | feat/home-history | 履歴閲覧 | localStorage['results:*'] を時系列表示。コピー・削除可。 | base_spec.md |

---

## 2. スタンバイ

### 進捗レポート
| No | branchName | 概要 | 詳細 | 備考 |
|---:|---|---|---|---|
| 20 | chore/report-standby | スタンバイ章レポート | 着手「21–24」／終了時「#3スカウト(30–33)へ」。 | コーディング不要 |

### 実装
| No | branchName | 概要 | 詳細 | 参照 |
|---:|---|---|---|---|
| 21 | feat/standby-ui | 初期UI | 名前入力2つ、先手ラジオ、開始ボタン活性条件。 | base_spec.md |
| 22 | feat/standby-flow | 中→完了UI | 押下で「スタンバイ中」→完了表示。 | base_spec.md |
| 23 | feat/standby-gate | ゲート | 完了後にgate。OKでscoutへ。 | base_spec.md |
| 24 | feat/standby-deal | デッキ配布 | deal呼出でstate初期化＋保存。 | base_spec.md |

---

## 3. スカウト

### 進捗レポート
| No | branchName | 概要 | 詳細 | 備考 |
|---:|---|---|---|---|
| 30 | chore/report-scout | スカウト章レポート | 着手「31–34」／終了時「#4アクション(40–45)へ」。 | コーディング不要 |

### 実装
| No | branchName | 概要 | 詳細 | 参照 |
|---:|---|---|---|---|
| 31 | feat/scout-opponenthand | 相手手札UI | 裏カード枚数一致。選択強調。 | scout_spec |
| 32 | feat/scout-recent-taken | 最近取られたUI | 直近カードを表示。「なし」fallback。 | scout_spec |
| 33 | feat/scout-pick-confirm | ピック確定 | 確認dialog→OKで手札移動+通知。キャンセル無変更。 | scout_spec |
| 34 | feat/scout-next | 遷移 | 確定後にactionへ。保存必須。 | scout_spec |

---

## 4. アクション

### 進捗レポート
| No | branchName | 概要 | 詳細 | 備考 |
|---:|---|---|---|---|
| 40 | chore/report-action | アクション章レポート | 着手「41–46」／終了時「#5ウォッチ(50–55)へ」。 | コーディング不要 |

### 実装
| No | branchName | 概要 | 詳細 | 参照 |
|---:|---|---|---|---|
| 41 | feat/action-footer | 手札UI | 下固定。カード選択強調。 | action_spec |
| 42 | feat/action-select-actor | 役者選択 | actor=tempに格納。解除可。同一カード黒子禁止。 | action_spec |
| 43 | feat/action-select-kuroko | 黒子選択 | kuroko=tempに格納。役者と別必須。 | action_spec |
| 44 | feat/action-confirm | 確定 | OKでステージ配置。確定前は未反映。 | action_spec |
| 45 | feat/action-guard | ガード | 手札不足/未選択時はボタン非活性+警告。 | action_spec |
| 46 | feat/action-to-watch | 遷移 | watch/gateへ。保存必須。 | action_spec |

---

## 5. ウォッチ

### 進捗レポート
| No | branchName | 概要 | 詳細 | 備考 |
|---:|---|---|---|---|
| 50 | chore/report-watch | ウォッチ章レポート | 着手「51–56」／終了時「#6スポットライト(60–66)へ」。 | コーディング不要 |

### 実装
| No | branchName | 概要 | 詳細 | 参照 |
|---:|---|---|---|---|
| 51 | feat/watch-present | 提示UI | 相手役者(表)/黒子(裏)を表示。 | watch_spec |
| 52 | feat/watch-boo-mandatory | ブー必須 | needed>=rでクラップ無効+バッジ。 | watch_spec |
| 53 | feat/watch-declare-flow | 宣言処理 | クラップ/ブー確定→state更新。 | watch_spec |
| 54 | feat/watch-declare-transition | 遷移 | clap→intermission/gate、boo→spotlight/gate。保存。 | watch_spec |
| 55 | feat/watch-myhand | 自手札モーダル | モーダルで表示。直近取られたも含む。 | watch_spec |
| 56 | feat/watch-guards | 戻る時など | 秘匿ガード、無効時警告。 | watch_spec |

---

## 6. スポットライト

### 進捗レポート
| No | branchName | 概要 | 詳細 | 備考 |
|---:|---|---|---|---|
| 60 | chore/report-spotlight | スポットライト章レポート | 着手「61–67」／終了時「#7インターミッション(70–71)へ」。 | コーディング不要 |

### 実装
| No | branchName | 概要 | 詳細 | 参照 |
|---:|---|---|---|---|
| 61 | feat/spotlight-reveal | 黒子公開 | 裏→表。1度限り。rank一致判定。 | spotlight_spec |
| 62 | feat/spotlight-ownership | 帰属 | 一致→提示者残留。不一致→ブー側へ。 | spotlight_spec |
| 63 | feat/spotlight-open-set | セット公開 | 行動権者のみ1枚公開。通知表示。 | spotlight_spec |
| 64 | feat/spotlight-bonus-joker | JOKER処理 | 追加1枚表裏配置。即curtaincallへ。 | spotlight_spec |
| 65 | feat/spotlight-secret-pair | 秘密ペア | gate後に同ランク手札を配置。スキップ可。 | spotlight_spec |
| 66 | feat/spotlight-exit | 遷移 | set残=1→curtaincall。他→intermission。保存。 | spotlight_spec |
| 67 | feat/spotlight-guards | ガード | 公開取り消し不可/多重禁止。 | spotlight_spec |

---

## 7. インターミッション

### 進捗レポート
| No | branchName | 概要 | 詳細 | 備考 |
|---:|---|---|---|---|
| 70 | chore/report-intermission | インターミッション章レポート | 着手「71–72」／終了時「#8カーテンコール(80–84)へ」。 | コーディング不要 |

### 実装
| No | branchName | 概要 | 詳細 | 参照 |
|---:|---|---|---|---|
| 71 | feat/intermission-gate | ハンドオフゲート | 「スタンバイ中→完了→OKで開始」。 | intermission_spec |
| 72 | feat/intermission-switch | 手番切替 | activePlayerを相手へ。 | intermission_spec |

---

## 8. カーテンコール

### 進捗レポート
| No | branchName | 概要 | 詳細 | 備考 |
|---:|---|---|---|---|
| 80 | chore/report-curtaincall | カーテンコール章レポート | 着手「81–85」／終了時「#9横断(90–96)へ」。 | コーディング不要 |

### 実装
| No | branchName | 概要 | 詳細 | 参照 |
|---:|---|---|---|---|
| 81 | feat/cc-gate | 開始ポップ | 「カーテンコール開始」通知→OK。 | curtaincall_spec |
| 82 | feat/cc-calc | 集計 | Kami合計-手札合計-ペナルティ。終局判定。 | curtaincall_spec |
| 83 | feat/cc-view | 結果UI | 勝敗/詳細/ボタン群。 | curtaincall_spec |
| 84 | feat/cc-save | 保存 | 要約形式でlocalStorage保存。 | base_spec.md |
| 85 | feat/cc-guards | ガード | 二重保存禁止等。 | curtaincall_spec |

---

## 9. 横断

### 進捗レポート
| No | branchName | 概要 | 詳細 | 備考 |
|---:|---|---|---|---|
| 90 | chore/report-shared | 横断章レポート | 着手「91–97」／終了時「#10テスト(100–106)へ」。 | コーディング不要 |

### 実装
| No | branchName | 概要 | 詳細 | 参照 |
|---:|---|---|---|---|
| 91 | feat/boardcheck-tabs | ボードチェックUI | bc=1/ボタン起動。非公開は隠す。 | 共通 |
| 92 | feat/secret-redraw-guard | 秘匿ガード | gate通過前は描画しない。戻るでクリア。 | spotlight_spec |
| 93 | feat/popup-copy | 文言集約 | messages.tsに集約。 | 各spec |
| 94 | chore/storage-abstract | 保存抽象化 | saveGame/loadGame/saveResult層。 | base_spec.md |
| 95 | chore/animation-core | 演出共通 | フェード/スライド適用。無効化可。 | base_spec.md |
| 96 | chore/progress-report | 定期進捗出力 | 各章のreportタスク内容を出力。 | 本リスト |
| 97 | chore/a11y-pass | A11y対応 | キーボード操作/aria属性。 | 共通 |

---

## 10. テスト

### 進捗レポート
| No | branchName | 概要 | 詳細 | 備考 |
|---:|---|---|---|---|
| 100 | chore/report-test | テスト章レポート | 着手「101–107」／終了時「#11整合(110–111)へ」。 | コーディング不要 |

### 実装
| No | branchName | 概要 | 詳細 | 参照 |
|---:|---|---|---|---|
| 101 | test/scaffold | 基盤テスト | store/ルータ/ランク関数境界値。 | base_spec.md |
| 102 | test/scout | スカウトテスト | ピック→確定。最近取られたUI。 | scout_spec |
| 103 | test/action | アクションテスト | 役者/黒子選択とガード。確定反映。 | action_spec |
| 104 | test/watch | ウォッチテスト | ブー必須境界。遷移分岐。 | watch_spec |
| 105 | test/spotlight | スポットライトテスト | 黒子公開/JOKER/秘密ペア。 | spotlight_spec |
| 106 | test/curtaincall | カーテンコールテスト | 通常/SET1/JOEKR終局。保存整合。 | curtaincall_spec |
| 107 | test/guard-shared | 共有ガードテスト | 秘匿再描画/連打ロック。 | 共通 |

---

## 11. 整合

### 進捗レポート
| No | branchName | 概要 | 詳細 | 備考 |
|---:|---|---|---|---|
| 110 | chore/report-sync | 整合章レポート | 着手「111–112」／終了で全完了宣言。 | コーディング不要 |

### 実装
| No | branchName | 概要 | 詳細 | 参照 |
|---:|---|---|---|---|
| 111 | chore/rulebook-sync | rule整合 | 用語/フロー/終了条件/集計式/ランク値を確認。差分は修正タスク追加。 | rulebook.md |
| 112 | chore/spec-lint | specリンタ |

