import { Directive, ElementRef, effect, inject, input } from '@angular/core';

export type DomContentInput = Node | (() => Node | null) | null | undefined;

/** Safely mounts a DOM Node (or factory result) into the host element via replaceChildren. */
@Directive({
  selector: '[klgDomNode]',
  standalone: true,
})
export class KlgDomHostDirective {
  readonly klgDomNode = input<DomContentInput>(null);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    effect(() => {
      const value = this.klgDomNode();
      const el = this.host.nativeElement;
      const node = typeof value === 'function' ? value() : value;
      if (node) {
        el.replaceChildren(node);
      } else {
        el.replaceChildren();
      }
    });
  }
}
