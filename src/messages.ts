export const DEFAULT_GATE_TITLE = 'ハンドオフゲート';
export const DEFAULT_GATE_CONFIRM_LABEL = '準備完了';
export const DEFAULT_GATE_MESSAGE =
  '端末を次のプレイヤーに渡したら「準備完了」を押して、秘匿情報の閲覧を開始してください。';
export const DEFAULT_CLOSE_LABEL = '閉じる';

export const NAVIGATION_BLOCK_TITLE = '戻る操作はできません';
export const NAVIGATION_BLOCK_MESSAGE =
  'ゲーム進行中はブラウザの戻る操作を利用できません。画面内のボタンから操作してください。';
export const NAVIGATION_BLOCK_CONFIRM_LABEL = 'OK';

export const HANDOFF_GATE_HINTS = Object.freeze([
  '端末を次のプレイヤーに渡したら「準備完了」を押してください。',
  'ゲートを通過した後に秘匿情報が画面へ描画されます。',
]);

export const HANDOFF_GATE_MODAL_NOTES = Object.freeze([
  'ゲート通過前は秘匿情報を DOM に出力しません。',
]);

export const INTERMISSION_GATE_TITLE = '手番交代';
export const INTERMISSION_GATE_CONFIRM_LABEL = 'OK（スカウトへ）';
export const INTERMISSION_BOARD_CHECK_LABEL = 'ボードチェック';
export const INTERMISSION_SUMMARY_LABEL = '前ラウンド要約';
export const INTERMISSION_SUMMARY_TITLE = '前ラウンド要約';
export const INTERMISSION_SUMMARY_CAPTION = '前ラウンドで公開された情報のみが表示されます。';
export const INTERMISSION_SUMMARY_EMPTY = '公開情報はまだありません。';
export const INTERMISSION_BACKSTAGE_ACTION_LABEL = 'バックステージ';
export const INTERMISSION_BACKSTAGE_DESCRIPTION =
  '直前のスポットライトでペア不成立でした。あなたはバックステージから1枚公開できます（1回）。処理が終わると自動的にインターミッションへ進みます。';
export const INTERMISSION_BACKSTAGE_REVEAL_LABEL = 'バックステージを公開';
export const INTERMISSION_BACKSTAGE_SKIP_LABEL = 'スキップ';
export const INTERMISSION_BACKSTAGE_REVEAL_TITLE = 'バックステージを公開';
export const INTERMISSION_BACKSTAGE_REVEAL_MESSAGE = '公開するカードを選んでください。';
export const INTERMISSION_BACKSTAGE_REVEAL_EMPTY_MESSAGE = '公開できるカードは残っていません。';
export const INTERMISSION_BACKSTAGE_REVEAL_GUARD_MESSAGE =
  'バックステージアクションを実行できる状態ではありません。';
export const INTERMISSION_BACKSTAGE_PENDING_MESSAGE =
  'バックステージアクションを実行するか、スキップしてください。';
export const INTERMISSION_BACKSTAGE_RESULT_MATCH = '一致！セットのカードとペアが成立しました。';
export const INTERMISSION_BACKSTAGE_RESULT_MISMATCH =
  '一致しませんでした。さらに1枚を手札に加えてください。';
export const INTERMISSION_BACKSTAGE_DRAW_TITLE = 'バックステージから取得';
export const INTERMISSION_BACKSTAGE_DRAW_MESSAGE = '手札に加えるカードを選んでください（非公開）';
export const INTERMISSION_BACKSTAGE_DRAW_EMPTY_MESSAGE =
  'これ以上取得できるカードはありません。';
export const INTERMISSION_BACKSTAGE_COMPLETE_MESSAGE = 'バックステージアクションを完了しました。';

export const BACKSTAGE_GATE_TITLE = 'バックステージ';
export const BACKSTAGE_GATE_CONFIRM_LABEL = 'インターミッションへ';
export const BACKSTAGE_GATE_MESSAGE =
  'バックステージアクションを完了するとインターミッションへ移動します。公開またはスキップの処理を行ってください。';
export const BACKSTAGE_GATE_SUBTITLE = 'バックステージアクション担当のプレイヤーを呼び出してください。';

export const STANDBY_DEAL_ERROR_MESSAGE =
  'スタンバイの初期化に失敗しました。もう一度お試しください。';
export const STANDBY_FIRST_PLAYER_ERROR_MESSAGE = '先手が未決定です。スタンバイに戻ります。';

export const BOARD_CHECK_MODAL_TITLE = 'ボードチェック';

export const SCOUT_PICK_CONFIRM_TITLE = 'カードを引く';
export const SCOUT_PICK_CONFIRM_MESSAGE = 'このカードを引いて手札に加えます。元に戻せません。';
export const SCOUT_PICK_CONFIRM_OK_LABEL = 'OK';
export const SCOUT_PICK_CONFIRM_CANCEL_LABEL = 'キャンセル';

export const SCOUT_BOARD_CHECK_LABEL = 'ボードチェック';
export const MY_HAND_LABEL = '自分の手札';
export const MY_HAND_MODAL_TITLE = '自分の手札';
export const MY_HAND_SECTION_TITLE = '現在の手札';
export const MY_HAND_EMPTY_MESSAGE = '手札はありません。';
export const MY_HAND_RECENT_EMPTY_MESSAGE = 'なし';
export const MY_HAND_RECENT_BADGE_LABEL = '直前に引いたカード';

export const SCOUT_HELP_BUTTON_LABEL = '？';
export const SCOUT_HELP_ARIA_LABEL = 'ヘルプ';

export const ACTION_CONFIRM_BUTTON_LABEL = '配置を確定';
export const ACTION_BOARD_CHECK_LABEL = 'ボードチェック';
export const ACTION_CONFIRM_MODAL_TITLE = '配置を確定';
export const ACTION_CONFIRM_MODAL_MESSAGE =
  '以下のカードをステージに配置します。確定すると元に戻せません。';
export const ACTION_CONFIRM_MODAL_OK_LABEL = 'OK';
export const ACTION_CONFIRM_MODAL_CANCEL_LABEL = 'キャンセル';
export const ACTION_GUARD_SELECTION_MESSAGE = '役者と黒子をそれぞれ選択してください。';
export const ACTION_GUARD_INSUFFICIENT_HAND_MESSAGE =
  '手札が2枚未満のため、ステージに配置を確定できません。';
export const ACTION_RESULT_TITLE = 'アクション完了';
export const ACTION_RESULT_OK_LABEL = 'ウォッチへ';

export const WATCH_BOARD_CHECK_LABEL = 'ボードチェック';
export const WATCH_MY_HAND_LABEL = MY_HAND_LABEL;
export const WATCH_HELP_BUTTON_LABEL = '？';
export const WATCH_HELP_ARIA_LABEL = 'ヘルプ';
export const WATCH_CLAP_BUTTON_LABEL = 'クラップ（同数）';
export const WATCH_BOO_BUTTON_LABEL = 'ブーイング（異なる）';
export const WATCH_ACTOR_LABEL = '役者（表）';
export const WATCH_KUROKO_LABEL = '黒子（裏）';
export const WATCH_REMAINING_PLACEHOLDER = '—';
export const WATCH_WARNING_BADGE_LABEL = 'ブーイング不足注意';
export const WATCH_CLAP_WARNING_MESSAGE = '残り機会的にブーイングが必要です';
export const WATCH_STAGE_EMPTY_MESSAGE = 'ステージにカードが配置されていません。';
export const WATCH_KUROKO_DEFAULT_DESCRIPTION = '黒子のカードはまだ公開されていません。';
export const WATCH_REDIRECTING_SUBTITLE = '宣言結果に応じた画面へ移動しています…';
export const WATCH_GUARD_REDIRECTING_SUBTITLE =
  '秘匿情報を再表示するにはウォッチゲートを通過してください。';

export const WATCH_DECISION_CONFIRM_TITLES = Object.freeze({
  clap: 'クラップの宣言',
  boo: 'ブーイングの宣言',
} as const);

export const WATCH_DECISION_CONFIRM_MESSAGES = Object.freeze({
  clap: 'クラップを宣言します。確定すると元に戻せません。',
  boo: 'ブーイングを宣言します。確定すると元に戻せません。',
} as const);

export const WATCH_DECISION_CONFIRM_OK_LABEL = 'OK';
export const WATCH_DECISION_CONFIRM_CANCEL_LABEL = 'キャンセル';

export const WATCH_RESULT_TITLES = Object.freeze({
  clap: 'クラップ！',
  boo: 'ブーイング！',
} as const);

export const WATCH_RESULT_MESSAGES = Object.freeze({
  clap: 'クラップを宣言しました。インターミッションへ進みます。',
  boo: 'ブーイングを宣言しました。スポットライトへ進みます。',
} as const);

export const WATCH_RESULT_OK_LABELS = Object.freeze({
  clap: 'インターミッションへ',
  boo: 'スポットライトへ',
} as const);

export const SPOTLIGHT_SECRET_GUARD_REDIRECTING_SUBTITLE =
  'シークレットペア処理のためゲートへ移動します…';
export const SPOTLIGHT_SET_OPEN_GUARD_REDIRECTING_SUBTITLE =
  'セット公開の準備のためゲートへ移動します…';

export const SPOTLIGHT_BOARD_CHECK_LABEL = 'ボードチェック';
export const SPOTLIGHT_HELP_BUTTON_LABEL = '？';
export const SPOTLIGHT_HELP_ARIA_LABEL = 'ヘルプ';
export const SPOTLIGHT_REVEAL_BUTTON_LABEL = '黒子を公開する';
export const SPOTLIGHT_REVEAL_CAPTION = '黒子を公開すると判定が確定します。元に戻せません。';
export const SPOTLIGHT_REVEAL_COMPLETED_CAPTION = '黒子は既に公開済みです。';
export const SPOTLIGHT_REVEAL_UNAVAILABLE_CAPTION = '公開できる黒子がありません。';
export const SPOTLIGHT_REVEAL_CONFIRM_TITLE = '黒子を公開';
export const SPOTLIGHT_REVEAL_CONFIRM_MESSAGE = '黒子のカードを公開します。公開後は取り消せません。';
export const SPOTLIGHT_REVEAL_CONFIRM_OK_LABEL = 'OK';
export const SPOTLIGHT_REVEAL_CONFIRM_CANCEL_LABEL = 'キャンセル';
export const SPOTLIGHT_RESULT_TITLE = '判定結果';
export const SPOTLIGHT_RESULT_MATCH_PREFIX = '一致！';
export const SPOTLIGHT_RESULT_MISMATCH_PREFIX = '不一致！';
export const SPOTLIGHT_RESULT_MATCH_MESSAGE = (playerName: string): string =>
  `${playerName}がセットをオープンできます。`;
export const SPOTLIGHT_RESULT_MISMATCH_MESSAGE = (playerName: string): string =>
  `${playerName}がセットをオープンできます。`;
export const SPOTLIGHT_RESULT_SKIP_LABEL = '今回はスキップ';
export const SPOTLIGHT_SET_OPEN_BUTTON_LABEL = 'セットをオープンする';
export const SPOTLIGHT_SET_PICKER_TITLE = 'セットをオープン';
export const SPOTLIGHT_SET_PICKER_MESSAGE = 'セットから公開するカードを選択してください。';
export const SPOTLIGHT_SET_PICKER_EMPTY_MESSAGE = '公開できるセットのカードは残っていません。';
export const SPOTLIGHT_SET_PICKER_CANCEL_LABEL = 'キャンセル';
export const SPOTLIGHT_SET_CARD_LABEL_PREFIX = 'カード';
export const SPOTLIGHT_SET_CONFIRM_TITLE = 'セットをオープン';
export const SPOTLIGHT_SET_CONFIRM_MESSAGE = '公開後は取り消せません。';
export const SPOTLIGHT_SET_CONFIRM_OK_LABEL = '公開する';
export const SPOTLIGHT_SET_CONFIRM_CANCEL_LABEL = '戻る';
export const SPOTLIGHT_SET_RESULT_TITLE = 'セット公開結果';
export const SPOTLIGHT_SET_RESULT_MESSAGE = (playerName: string, cardLabel: string): string =>
  `${playerName}が${cardLabel}をオープンしました。`;
export const SPOTLIGHT_SET_RESULT_OK_LABEL = 'OK';
export const SPOTLIGHT_SET_OPEN_GUARD_MESSAGE = 'セットを公開できる状態ではありません。';
export const SPOTLIGHT_SET_OPEN_GATE_MESSAGE = (playerName: string): string =>
  `${playerName}がセットをオープンします。準備ができたら「${DEFAULT_GATE_CONFIRM_LABEL}」を押してください。`;
export const SPOTLIGHT_PAIR_CHECK_TITLE = 'ペアの判定';
export const SPOTLIGHT_PAIR_CHECK_MESSAGE =
  '公開された役者札と同じ数字の手札があるか確認してください。同じ数字を持っていたら場に出してペア成立、持っていなければペア不成立です。';
export const SPOTLIGHT_PAIR_CHECK_SKIPPED_MESSAGE = '今回はセットを公開せずに進みます。';
export const SPOTLIGHT_PAIR_CHECK_PAIRED_MESSAGE = 'ペアができました！';
export const SPOTLIGHT_PAIR_CHECK_UNPAIRED_MESSAGE = 'ペアはできませんでした！';
export const SPOTLIGHT_PAIR_CHECK_CAPTION =
  '判定が終わったら「OK」を押して、必要に応じてバックステージ処理へ進みましょう。';
export const SPOTLIGHT_PAIR_CHECK_CONFIRM_LABEL = 'OK';
export const SPOTLIGHT_JOKER_BONUS_TITLE = 'JOKERボーナス';
export const SPOTLIGHT_JOKER_BONUS_MESSAGE = (playerName: string): string =>
  `${playerName}のターンです。JOKER！追加でもう1枚オープンして、自動でペアを作ります。`;
export const SPOTLIGHT_JOKER_BONUS_MULTI_PROMPT = '追加で公開するカードを選択してください。';
export const SPOTLIGHT_JOKER_BONUS_EMPTY_MESSAGE =
  '追加で公開できるカードがありません。カーテンコールへ進みます。';
export const SPOTLIGHT_JOKER_BONUS_EMPTY_ACTION_LABEL = 'カーテンコールへ';
export const SPOTLIGHT_JOKER_BONUS_RESULT_MESSAGE = (
  playerName: string,
  cardLabel: string,
): string => `JOKERボーナス：${playerName}が${cardLabel}とジョーカーでペアを作りました。`;
export const SPOTLIGHT_JOKER_BONUS_EMPTY_RESULT_MESSAGE = (playerName: string): string =>
  `JOKERボーナス：${playerName}は追加で公開できるカードがなく、自動ペアは成立しません。`;
export const SPOTLIGHT_SECRET_PAIR_TITLE = 'シークレットペア';
export const SPOTLIGHT_SECRET_PAIR_MESSAGE = (playerName: string, cardLabel: string): string =>
  `${playerName}のターンです。${cardLabel}と同じランクの手札を選んでペアを作れます。`;
export const SPOTLIGHT_SECRET_PAIR_EMPTY_MESSAGE =
  '同じランクの手札はありません。今回はスキップできます。';
export const SPOTLIGHT_SECRET_PAIR_SKIP_LABEL = 'ペアを作らない';
export const SPOTLIGHT_SECRET_PAIR_GATE_MESSAGE = (playerName: string): string =>
  `${playerName}の手札を表示します。相手に画面が見えないことを確認してから進んでください。`;
export const SPOTLIGHT_SECRET_PAIR_RESULT_MESSAGE = (
  playerName: string,
  openCardLabel: string,
  handCardLabel: string,
): string => `${playerName}が${openCardLabel}と${handCardLabel}でシークレットペアを作りました。`;
export const SPOTLIGHT_SECRET_PAIR_SKIP_RESULT_MESSAGE = (playerName: string): string =>
  `${playerName}はシークレットペアを作成しませんでした。`;

export const CURTAINCALL_GATE_MODAL_TITLE = 'カーテンコール（結果発表）が始まります';
export const CURTAINCALL_GATE_MESSAGE = 'この結果は両者で確認できます。';
export const CURTAINCALL_GATE_CONFIRM_LABEL = 'OK（結果を見る）';
export const CURTAINCALL_BOARD_CHECK_LABEL = 'ボードチェック';
export const CURTAINCALL_HOME_BUTTON_LABEL = 'HOME';
export const CURTAINCALL_NEW_GAME_BUTTON_LABEL = '新しいゲーム';
export const CURTAINCALL_SAVE_BUTTON_LABEL = '結果の保存';
export const CURTAINCALL_SAVE_DIALOG_TITLE = '結果の保存';
export const CURTAINCALL_SAVE_TITLE_LABEL = 'タイトル';
export const CURTAINCALL_SAVE_TITLE_PLACEHOLDER = '例：2025/09/24_第12局';
export const CURTAINCALL_SAVE_MEMO_LABEL = 'メモ（任意）';
export const CURTAINCALL_SAVE_MEMO_PLACEHOLDER = '振り返りや共有メモを入力できます。';
export const CURTAINCALL_SAVE_SUBMIT_LABEL = '保存';
export const CURTAINCALL_SAVE_CANCEL_LABEL = 'キャンセル';
export const CURTAINCALL_SAVE_SUCCESS_MESSAGE = '結果を保存しました。';
export const CURTAINCALL_SAVE_FAILURE_MESSAGE = '結果の保存に失敗しました。';
export const CURTAINCALL_SAVE_REQUIRED_MESSAGE = 'タイトルを入力してください。';
export const CURTAINCALL_SAVE_UNAVAILABLE_MESSAGE = '結果データの準備が完了していません。';
export const CURTAINCALL_SAVE_ALREADY_SAVED_MESSAGE = '結果はすでに保存済みです。';
export const CURTAINCALL_SAVE_DIALOG_OPEN_MESSAGE = '結果の保存ダイアログを表示中です。';
export const CURTAINCALL_SAVE_IN_PROGRESS_MESSAGE = '結果の保存処理が進行中です。';
export const CURTAINCALL_BREAKDOWN_KAMI_LABEL = 'カミ合計';
export const CURTAINCALL_BREAKDOWN_HAND_LABEL = '手札合計';
export const CURTAINCALL_BREAKDOWN_PENALTY_LABEL = 'ブーイングペナルティ';
export const CURTAINCALL_BREAKDOWN_FINAL_LABEL = '最終ポイント';
export const CURTAINCALL_BOO_PROGRESS_LABEL = 'ブーイング達成';
export const CURTAINCALL_KAMI_SECTION_LABEL = 'カミ';
export const CURTAINCALL_HAND_SECTION_LABEL = '手札';
export const CURTAINCALL_KAMI_EMPTY_MESSAGE = 'カミ札はありません。';
export const CURTAINCALL_HAND_EMPTY_MESSAGE = '手札はありません。';
export const CURTAINCALL_SUMMARY_PREPARING_SUBTITLE = '結果データを準備しています…';

export const SCOUT_PICK_RESULT_TITLE = 'カードを取得しました';
export const SCOUT_PICK_RESULT_OK_LABEL = 'OK';
export const SCOUT_PICK_RESULT_DRAWN_MESSAGE = (cardLabel: string): string => `${cardLabel}を引きました！`;
export const SCOUT_PICK_RESULT_PREVIEW_CAPTION = '引いたカードは以下の通りです。';
export const SCOUT_PICK_RESULT_ACTION_NOTICE = (
  playerName: string,
  opponentName: string,
): string =>
  `${playerName}は${opponentName}に画面が見えないことを確認し、「${SCOUT_PICK_RESULT_OK_LABEL}」を押してアクションフェーズへ進みましょう。`;

export const HOME_SETTINGS_TITLE = '設定';
export const HOME_SETTINGS_MESSAGE = '設定メニューは現在準備中です。';
export const HELP_POPUP_BLOCKED_TOAST_MESSAGE =
  'ヘルプを開けませんでした。ブラウザのポップアップ設定をご確認ください。';
export const HELP_POPUP_BLOCKED_CONSOLE_MESSAGE =
  'ヘルプ画面を開けませんでした。ポップアップブロックを解除してください。';

export const HISTORY_DIALOG_TITLE = 'リザルト履歴';
export const HISTORY_DIALOG_DESCRIPTION =
  '保存済みのリザルトを確認できます。コピーや削除が可能です（最大50件まで保持されます）。';
export const HISTORY_EMPTY_MESSAGE = '保存されたリザルト履歴はまだありません。';
export const HISTORY_UNKNOWN_TIMESTAMP = '日時不明';
export const HISTORY_COPY_BUTTON_LABEL = 'コピー';
export const HISTORY_DELETE_BUTTON_LABEL = '削除';
export const HISTORY_COPY_SUCCESS = '履歴をコピーしました。';
export const HISTORY_COPY_FAILURE = '履歴をコピーできませんでした。';
export const HISTORY_DELETE_SUCCESS = '履歴を削除しました。';
export const HISTORY_DELETE_FAILURE = '履歴の削除に失敗しました。';
