export abstract class UIComponent<T extends HTMLElement = HTMLElement> {
  protected readonly element: T;

  protected constructor(element: T) {
    this.element = element;
  }

  get el(): T {
    return this.element;
  }

  mount(target: Element, position: InsertPosition = 'beforeend'): this {
    if (position === 'beforeend') {
      target.append(this.element);
    } else if (position === 'afterbegin') {
      target.prepend(this.element);
    } else {
      target.insertAdjacentElement(position, this.element);
    }
    return this;
  }

  unmount(): void {
    this.element.remove();
  }
}
