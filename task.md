# task.md — カーテンコール 開発タスクリスト（改訂版 v5：完全通し番号＋UI/演出細分化）

> **仕様整合元**: rulebook.md / base\_spec.md / 0–7各phase spec
> **原則**: 1タスク=1ブランチ=最小粒度。UI要素・イベント・状態・遷移・ガード・表示文言・AC(受け入れ基準)まで明記。
> **進捗報告タスク**も通し番号に統一。章の冒頭に配置し「開始宣言／終了報告／次の予定共有」を行う（コーディング不要）。

---

## 0. プロジェクト基盤

(0〜14までは実装済みとして保持)

| No | branchName                  | 概要            | 詳細                                                                  | 参照            |
| -: | --------------------------- | ------------- | ------------------------------------------------------------------- | ------------- |
|  0 | chore/report-foundation     | 基盤章の開始/終了レポート | 開始時:「#0着手（1–9）」／終了時:「#0完了→#1 HOMEへ」。予定・リスク共有。                       | -             |
|  1 | chore/scaffold              | プロジェクト初期化     | index.html／src/app.ts, router.ts, state.ts／UIコンポ骨格。Lint/Prettier導入。 | base\_spec.md |
|  2 | feat/router-hash            | ハッシュルータ       | `/#/`HOME〜`/#/resume/gate`まで。未知→HOMEへ。`router.go`実装。                | base\_spec.md |
|  3 | feat/state-model            | 状態定義          | Player, Card, Stage, Hand, Turn, Phaseなど型とstore実装。                  | base\_spec.md |
|  4 | feat/deck-build             | デッキ配布         | 53枚生成→シャッフル→set13／手札20×2。重複なし保証。                                    | base\_spec.md |
|  5 | feat/rank-value             | ランク関数         | A=1, J=11, Q=12, K=13, Joker=0。将来切替可。                               | rulebook.md   |
|  6 | feat/persist-store          | 永続化基盤         | localStorage API。resume/gate以外からの復元は禁止。                             | base\_spec.md |
|  7 | feat/ui-core                | UIコンポ         | Button/Modal/Toast/Cardなど共通。連打ロック実装。                                | 共通            |
|  8 | feat/modal-gate             | 全画面ゲート        | OK押下でonGatePass。秘匿要素をゲート前非描画。                                       | 各spec         |
|  9 | feat/modal-boardcheck       | ボードチェック       | セット/ステージ/スコアタブ。公開情報のみ表示。                                            | 各spec         |
| 10 | chore/report-home           | HOME章レポート     | 着手「11–14」／終了時「#2スタンバイへ」。                                            | -             |
| 11 | feat/home-structure         | HOME骨格        | main/h1/ボタン群コンテナ。                                                   | base\_spec.md |
| 12 | feat/home-btn-start         | 「ゲーム開始」ボタン    | 配置＋クリック時に`/#/standby`へ遷移。非活性条件なし。                                   | base\_spec.md |
| 13 | feat/home-btn-resume        | 「つづきから」ボタン    | セーブ有→遷移、無→非活性。セーブ日時表示。                                              | base\_spec.md |
| 14 | feat/home-btn-settings-help | 「設定」「ヘルプ」ボタン  | 設定→未実装時はダイアログ警告。ヘルプ→rulebook新規タブ。                                   | base\_spec.md |

---

## 2. スタンバイ

| No | branchName           | 概要         | 詳細                      | 参照            |
| -: | -------------------- | ---------- | ----------------------- | ------------- |
| 15 | chore/report-standby | スタンバイ章レポート | 着手「16–19」／終了時「#3スカウトへ」。 | -             |
| 16 | feat/standby-ui      | 初期UI       | 名前入力2つ、先手ラジオ、開始ボタン活性条件。 | standby\_spec |
| 17 | feat/standby-flow    | 中→完了UI     | 押下で「スタンバイ中」→完了表示。       | standby\_spec |
| 18 | feat/standby-gate    | ゲート        | 完了後にgate。OKでscoutへ。     | standby\_spec |
| 19 | feat/standby-deal    | デッキ配布      | deal呼出でstate初期化＋保存。     | standby\_spec |

---

## 3. スカウト

| No | branchName              | 概要        | 詳細                            | 参照          |
| -: | ----------------------- | --------- | ----------------------------- | ----------- |
| 20 | chore/report-scout      | スカウト章レポート | 着手「21–24」／終了時「#4アクションへ」。      | -           |
| 21 | feat/scout-opponenthand | 相手手札UI    | 裏カード枚数一致。選択強調。                | scout\_spec |
| 22 | feat/scout-recent-taken | 最近取られたUI  | 直近カードを表示。「なし」fallback。        | scout\_spec |
| 23 | feat/scout-pick-confirm | ピック確定     | 確認dialog→OKで手札移動+通知。キャンセル無変更。 | scout\_spec |
| 24 | feat/scout-next         | 遷移        | 確定後にactionへ。保存必須。             | scout\_spec |

---

## 4. アクション

| No | branchName                | 概要         | 詳細                           | 参照           |
| -: | ------------------------- | ---------- | ---------------------------- | ------------ |
| 25 | chore/report-action       | アクション章レポート | 着手「26–31」／終了時「#5ウォッチへ」。      | -            |
| 26 | feat/action-footer        | 手札UI       | 下固定。カード選択強調。                 | action\_spec |
| 27 | feat/action-select-actor  | 役者選択       | actor=tempに格納。解除可。同一カード黒子禁止。 | action\_spec |
| 28 | feat/action-select-kuroko | 黒子選択       | kuroko=tempに格納。役者と別必須。       | action\_spec |
| 29 | feat/action-confirm       | 確定         | OKでステージ配置。確定前は未反映。           | action\_spec |
| 30 | feat/action-guard         | ガード        | 手札不足/未選択時はボタン非活性+警告。         | action\_spec |
| 31 | feat/action-to-watch      | 遷移         | watch/gateへ。保存必須。            | action\_spec |

---

## 5. ウォッチ

| No | branchName                    | 概要        | 詳細                                            | 参照          |
| -: | ----------------------------- | --------- | --------------------------------------------- | ----------- |
| 32 | chore/report-watch            | ウォッチ章レポート | 着手「33–38」／終了時「#6スポットライトへ」。                    | -           |
| 33 | feat/watch-present            | 提示UI      | 相手役者(表)/黒子(裏)を表示。                             | watch\_spec |
| 34 | feat/watch-boo-mandatory      | ブー必須      | needed>=rでクラップ無効+バッジ。                         | watch\_spec |
| 35 | feat/watch-declare-flow       | 宣言処理      | クラップ/ブー確定→state更新。                            | watch\_spec |
| 36 | feat/watch-declare-transition | 遷移        | clap→intermission/gate、boo→spotlight/gate。保存。 | watch\_spec |
| 37 | feat/watch-myhand             | 自手札モーダル   | モーダルで表示。直近取られたも含む。                            | watch\_spec |
| 38 | feat/watch-guards             | 戻る時など     | 秘匿ガード、無効時警告。                                  | watch\_spec |

---

## 6. スポットライト

| No | branchName                 | 概要           | 詳細                                    | 参照              |
| -: | -------------------------- | ------------ | ------------------------------------- | --------------- |
| 39 | chore/report-spotlight     | スポットライト章レポート | 着手「40–46」／終了時「#7インターミッションへ」。          | -               |
| 40 | feat/spotlight-reveal      | 黒子公開         | 裏→表。1度限り。rank一致判定。                    | spotlight\_spec |
| 41 | feat/spotlight-ownership   | 帰属           | 一致→提示者残留。不一致→ブー側へ。                    | spotlight\_spec |
| 42 | feat/spotlight-open-set    | セット公開        | 行動権者のみ1枚公開。通知表示。                      | spotlight\_spec |
| 43 | feat/spotlight-bonus-joker | JOKER処理      | 追加1枚表裏配置。即curtaincallへ。               | spotlight\_spec |
| 44 | feat/spotlight-secret-pair | 秘密ペア         | gate後に同ランク手札を配置。スキップ可。                | spotlight\_spec |
| 45 | feat/spotlight-exit        | 遷移           | set残=1→curtaincall。他→intermission。保存。 | spotlight\_spec |
| 46 | feat/spotlight-guards      | ガード          | 公開取り消し不可/多重禁止。                        | spotlight\_spec |

---

## 7. インターミッション

| No | branchName                | 概要             | 詳細                         | 参照                 |
| -: | ------------------------- | -------------- | -------------------------- | ------------------ |
| 47 | chore/report-intermission | インターミッション章レポート | 着手「48–49」／終了時「#8カーテンコールへ」。 | -                  |
| 48 | feat/intermission-gate    | ハンドオフゲート       | 「スタンバイ中→完了→OKで開始」。         | intermission\_spec |
| 49 | feat/intermission-switch  | 手番切替           | activePlayerを相手へ。          | intermission\_spec |

---

## 8. カーテンコール

| No | branchName               | 概要           | 詳細                      | 参照                |
| -: | ------------------------ | ------------ | ----------------------- | ----------------- |
| 50 | chore/report-curtaincall | カーテンコール章レポート | 着手「51–55」／終了時「#9横断へ」。   | -                 |
| 51 | feat/cc-gate             | 開始ポップ        | 「カーテンコール開始」通知→OK。       | curtaincall\_spec |
| 52 | feat/cc-calc             | 集計           | Kami合計-手札合計-ペナルティ。終局判定。 | curtaincall\_spec |
| 53 | feat/cc-view             | 結果UI         | 勝敗/詳細/ボタン群。             | curtaincall\_spec |
| 54 | feat/cc-save             | 保存           | 要約形式でlocalStorage保存。    | curtaincall\_spec |
| 55 | feat/cc-guards           | ガード          | 二重保存禁止等。                | curtaincall\_spec |

---

## 9. 横断

| No | branchName               | 概要        | 詳細                             | 参照              |
| -: | ------------------------ | --------- | ------------------------------ | --------------- |
| 56 | chore/report-shared      | 横断章レポート   | 着手「57–62」／終了時「#10テストへ」。        | -               |
| 57 | feat/boardcheck-tabs     | ボードチェックUI | bc=1/ボタン起動。非公開は隠す。             | 共通              |
| 58 | feat/secret-redraw-guard | 秘匿ガード     | gate通過前は描画しない。戻るでクリア。          | spotlight\_spec |
| 59 | feat/popup-copy          | 文言集約      | messages.tsに集約。                | 各spec           |
| 60 | chore/storage-abstract   | 保存抽象化     | saveGame/loadGame/saveResult層。 | base\_spec.md   |
| 61 | chore/animation-core     | 演出共通      | フェード/スライド適用。無効化可。              | base\_spec.md   |
| 62 | chore/a11y-pass          | A11y対応    | キーボード操作/aria属性。                | 共通              |

---

## 10. テスト

| No | branchName        | 概要         | 詳細                     | 参照                |
| -: | ----------------- | ---------- | ---------------------- | ----------------- |
| 63 | chore/report-test | テスト章レポート   | 着手「64–70」／終了時「#11整合へ」。 | -                 |
| 64 | test/scaffold     | 基盤テスト      | store/ルータ/ランク関数境界値。    | base\_spec.md     |
| 65 | test/scout        | スカウトテスト    | ピック→確定。最近取られたUI。       | scout\_spec       |
| 66 | test/action       | アクションテスト   | 役者/黒子選択とガード。確定反映。      | action\_spec      |
| 67 | test/watch        | ウォッチテスト    | ブー必須境界。遷移分岐。           | watch\_spec       |
| 68 | test/spotlight    | スポットライトテスト | 黒子公開/JOKER/秘密ペア。       | spotlight\_spec   |
| 69 | test/curtaincall  | カーテンコールテスト | 通常/SET1/JOEKR終局。保存整合。  | curtaincall\_spec |
| 70 | test/guard-shared | 共有ガードテスト   | 秘匿再描画/連打ロック。           | 共通                |

---

## 11. 整合

| No | branchName          | 概要      | 詳細                                  | 参照          |
| -: | ------------------- | ------- | ----------------------------------- | ----------- |
| 71 | chore/report-sync   | 整合章レポート | 着手「72–73」／終了で全完了宣言。                 | -           |
| 72 | chore/rulebook-sync | rule整合  | 用語/フロー/終了条件/集計式/ランク値を確認。差分は修正タスク追加。 | rulebook.md |
| 73 | chore/spec-lint     | specリンタ | 各specの整合・リンタリング。誤記修正。               | 各spec       |
