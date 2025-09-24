import { UIButton, ButtonVariant } from '../ui/button.js';

export interface PlaceholderAction {
  label: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  preventRapid?: boolean;
  lockDuration?: number;
  onSelect: () => void;
}

export interface PlaceholderOptions {
  title: string;
  subtitle?: string;
  actions?: PlaceholderAction[];
}

export const createPlaceholderView = (options: PlaceholderOptions): HTMLElement => {
  const section = document.createElement('section');
  section.className = 'view';

  const wrapper = document.createElement('div');
  wrapper.className = 'placeholder';

  const title = document.createElement('h1');
  title.className = 'placeholder__title';
  title.textContent = options.title;
  wrapper.append(title);

  if (options.subtitle) {
    const subtitle = document.createElement('p');
    subtitle.className = 'placeholder__subtitle';
    subtitle.textContent = options.subtitle;
    wrapper.append(subtitle);
  }

  if (options.actions && options.actions.length > 0) {
    const actions = document.createElement('div');
    actions.className = 'placeholder__actions';
    options.actions.forEach((action) => {
      const button = new UIButton({
        label: action.label,
        variant: action.variant,
        disabled: action.disabled,
        preventRapid: action.preventRapid,
        lockDuration: action.lockDuration,
      });
      button.onClick(() => action.onSelect());
      actions.append(button.el);
    });
    wrapper.append(actions);
  }

  section.append(wrapper);
  return section;
};
