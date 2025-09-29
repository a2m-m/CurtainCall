import { UIComponent } from './component.js';
import {
  type AppSettings,
  type PlayerNameSettings,
  type RankValueMap,
  CUSTOM_RANK_VALUE_RULE_ID,
  PLAYER_NAME_MAX_LENGTH,
  RANK_VALUE_KEYS,
  RANK_VALUE_MAX,
  RANK_VALUE_MIN,
  DEFAULT_SETTINGS,
} from '../settings.js';
import { DEFAULT_RANK_VALUE_RULE } from '../rank.js';
import {
  DEFAULT_PLAYER_NAMES,
  PLAYER_IDS,
  type CardRank,
  type PlayerId,
} from '../state.js';
import {
  HOME_SETTINGS_PLAYER_SECTION_TITLE,
  HOME_SETTINGS_PLAYER_SECTION_DESCRIPTION,
  HOME_SETTINGS_PLAYER_NAME_LABEL_LUMINA,
  HOME_SETTINGS_PLAYER_NAME_LABEL_NOX,
  HOME_SETTINGS_PLAYER_NAME_HINT,
  HOME_SETTINGS_RANK_SECTION_TITLE,
  HOME_SETTINGS_RANK_SECTION_DESCRIPTION,
  HOME_SETTINGS_RANK_RULE_LEGEND,
  HOME_SETTINGS_RANK_RULE_DEFAULT_LABEL,
  HOME_SETTINGS_RANK_RULE_CUSTOM_LABEL,
  HOME_SETTINGS_RANK_RULE_CUSTOM_DESCRIPTION,
  HOME_SETTINGS_RANK_TABLE_CAPTION,
  HOME_SETTINGS_SOUND_SECTION_TITLE,
  HOME_SETTINGS_SOUND_SECTION_DESCRIPTION,
  HOME_SETTINGS_SOUND_EFFECTS_LABEL,
  HOME_SETTINGS_APPLY_NOTE,
} from '../messages.js';

const PLAYER_LABEL: Record<PlayerId, string> = {
  lumina: HOME_SETTINGS_PLAYER_NAME_LABEL_LUMINA,
  nox: HOME_SETTINGS_PLAYER_NAME_LABEL_NOX,
};

export class SettingsForm extends UIComponent<HTMLFormElement> {
  private readonly playerInputs: Record<PlayerId, HTMLInputElement> = {
    lumina: document.createElement('input'),
    nox: document.createElement('input'),
  };

  private readonly rankInputs: Record<CardRank, HTMLInputElement> = Object.fromEntries(
    RANK_VALUE_KEYS.map((rank) => [rank, document.createElement('input')]),
  ) as Record<CardRank, HTMLInputElement>;

  private readonly submitHandlers = new Set<() => void>();

  private rankRuleDefault!: HTMLInputElement;

  private rankRuleCustom!: HTMLInputElement;

  private effectsCheckbox!: HTMLInputElement;

  constructor(settings: AppSettings) {
    super(document.createElement('form'));
    this.element.className = 'settings-form';
    this.element.noValidate = true;

    this.element.addEventListener('submit', (event) => {
      event.preventDefault();
      for (const handler of this.submitHandlers) {
        handler();
      }
    });

    this.buildPlayerSection(settings);
    this.buildRankSection(settings);
    this.buildSoundSection(settings);
    this.appendApplyNote();

    this.updateRankInputsState();
  }

  private buildPlayerSection(settings: AppSettings): void {
    const section = this.createSection(
      HOME_SETTINGS_PLAYER_SECTION_TITLE,
      HOME_SETTINGS_PLAYER_SECTION_DESCRIPTION,
    );

    const list = document.createElement('div');
    list.className = 'settings-form__players';
    section.append(list);

    for (const playerId of PLAYER_IDS) {
      const field = document.createElement('div');
      field.className = 'settings-form__field';

      const label = document.createElement('label');
      const inputId = `settings-player-${playerId}`;
      label.htmlFor = inputId;
      label.className = 'settings-form__label';
      label.textContent = PLAYER_LABEL[playerId] ?? playerId;

      const input = document.createElement('input');
      input.type = 'text';
      input.id = inputId;
      input.className = 'settings-form__text-input';
      input.maxLength = PLAYER_NAME_MAX_LENGTH;
      input.autocomplete = 'off';
      input.placeholder = DEFAULT_PLAYER_NAMES[playerId];
      input.value = settings.players[playerId] ?? DEFAULT_PLAYER_NAMES[playerId];

      field.append(label, input);
      list.append(field);
      this.playerInputs[playerId] = input;
    }

    const hint = document.createElement('p');
    hint.className = 'settings-form__hint';
    hint.textContent = HOME_SETTINGS_PLAYER_NAME_HINT;
    section.append(hint);
  }

  private buildRankSection(settings: AppSettings): void {
    const section = this.createSection(
      HOME_SETTINGS_RANK_SECTION_TITLE,
      HOME_SETTINGS_RANK_SECTION_DESCRIPTION,
    );

    const fieldset = document.createElement('fieldset');
    fieldset.className = 'settings-form__fieldset';

    const legend = document.createElement('legend');
    legend.className = 'settings-form__legend';
    legend.textContent = HOME_SETTINGS_RANK_RULE_LEGEND;
    fieldset.append(legend);

    const defaultOption = this.createRankRuleOption(
      'settings-rank-rule-default',
      DEFAULT_RANK_VALUE_RULE,
      HOME_SETTINGS_RANK_RULE_DEFAULT_LABEL,
    );
    const customOption = this.createRankRuleOption(
      'settings-rank-rule-custom',
      CUSTOM_RANK_VALUE_RULE_ID,
      HOME_SETTINGS_RANK_RULE_CUSTOM_LABEL,
    );

    this.rankRuleDefault = defaultOption.querySelector('input[type="radio"]') as HTMLInputElement;
    this.rankRuleCustom = customOption.querySelector('input[type="radio"]') as HTMLInputElement;

    fieldset.append(defaultOption, customOption);

    const customDescription = document.createElement('p');
    customDescription.className = 'settings-form__hint';
    customDescription.textContent = HOME_SETTINGS_RANK_RULE_CUSTOM_DESCRIPTION;
    fieldset.append(customDescription);

    section.append(fieldset);

    if (settings.rank.ruleId === CUSTOM_RANK_VALUE_RULE_ID) {
      this.rankRuleCustom.checked = true;
    } else {
      this.rankRuleDefault.checked = true;
    }

    this.rankRuleDefault.addEventListener('change', () => this.updateRankInputsState());
    this.rankRuleCustom.addEventListener('change', () => this.updateRankInputsState());

    const table = document.createElement('table');
    table.className = 'settings-form__rank-table';

    const caption = document.createElement('caption');
    caption.textContent = HOME_SETTINGS_RANK_TABLE_CAPTION;
    table.append(caption);

    const tbody = document.createElement('tbody');
    table.append(tbody);

    for (const rank of RANK_VALUE_KEYS) {
      const row = document.createElement('tr');
      row.className = 'settings-form__rank-row';

      const header = document.createElement('th');
      header.scope = 'row';
      header.className = 'settings-form__rank-header';
      header.textContent = rank;

      const cell = document.createElement('td');
      cell.className = 'settings-form__rank-cell';

      const input = this.rankInputs[rank];
      input.type = 'number';
      input.inputMode = 'numeric';
      input.min = String(RANK_VALUE_MIN);
      input.max = String(RANK_VALUE_MAX);
      input.step = '1';
      input.className = 'settings-form__number-input';
      input.id = `settings-rank-${rank.toLowerCase()}`;
      input.value = String(settings.rank.values[rank] ?? DEFAULT_SETTINGS.rank.values[rank]);

      cell.append(input);
      row.append(header, cell);
      tbody.append(row);
    }

    section.append(table);
  }

  private buildSoundSection(settings: AppSettings): void {
    const section = this.createSection(
      HOME_SETTINGS_SOUND_SECTION_TITLE,
      HOME_SETTINGS_SOUND_SECTION_DESCRIPTION,
    );

    const label = document.createElement('label');
    label.className = 'settings-form__checkbox';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'settings-form__checkbox-input';
    checkbox.checked = settings.sound.effects;

    const span = document.createElement('span');
    span.className = 'settings-form__checkbox-label';
    span.textContent = HOME_SETTINGS_SOUND_EFFECTS_LABEL;

    label.append(checkbox, span);
    section.append(label);

    this.effectsCheckbox = checkbox;
  }

  private appendApplyNote(): void {
    const note = document.createElement('p');
    note.className = 'settings-form__note';
    note.textContent = HOME_SETTINGS_APPLY_NOTE;
    this.element.append(note);
  }

  private createSection(title: string, description?: string): HTMLElement {
    const section = document.createElement('section');
    section.className = 'settings-form__section';

    const heading = document.createElement('h3');
    heading.className = 'settings-form__section-title';
    heading.textContent = title;
    section.append(heading);

    if (description) {
      const paragraph = document.createElement('p');
      paragraph.className = 'settings-form__section-description';
      paragraph.textContent = description;
      section.append(paragraph);
    }

    this.element.append(section);
    return section;
  }

  private createRankRuleOption(
    id: string,
    value: string,
    labelText: string,
  ): HTMLLabelElement {
    const label = document.createElement('label');
    label.className = 'settings-form__radio-option';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'settings-rank-rule';
    input.id = id;
    input.value = value;

    const text = document.createElement('span');
    text.className = 'settings-form__radio-label';
    text.textContent = labelText;

    label.append(input, text);
    return label;
  }

  private updateRankInputsState(): void {
    const disabled = !this.rankRuleCustom.checked;
    for (const input of Object.values(this.rankInputs)) {
      input.disabled = disabled;
      input.tabIndex = disabled ? -1 : 0;
    }
  }

  getValues(): AppSettings {
    const players: PlayerNameSettings = {
      lumina: this.playerInputs.lumina.value,
      nox: this.playerInputs.nox.value,
    };

    const rankRule = this.rankRuleCustom.checked ? CUSTOM_RANK_VALUE_RULE_ID : DEFAULT_RANK_VALUE_RULE;

    const rankValues: RankValueMap = { ...DEFAULT_SETTINGS.rank.values };
    for (const rank of RANK_VALUE_KEYS) {
      const raw = this.rankInputs[rank].value;
      rankValues[rank] = raw === '' ? DEFAULT_SETTINGS.rank.values[rank] : Number(raw);
    }

    return {
      players,
      rank: {
        ruleId: rankRule,
        values: rankValues,
      },
      sound: {
        effects: this.effectsCheckbox.checked,
      },
    };
  }

  onSubmit(handler: () => void): void {
    this.submitHandlers.add(handler);
  }
}
