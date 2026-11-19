import type { CustomizationGroup, CustomizationOption } from '../../types';

/** Selected option ids per customisation group id. */
export type Selection = Record<string, string[]>;

export type GroupKind = 'radio' | 'multi' | 'optionalSingle';

export function groupKind(group: CustomizationGroup): GroupKind {
  if (group.maxSelectable > 1) return 'multi';
  return group.isRequired ? 'radio' : 'optionalSingle';
}

/** Same defaults as the Flutter screen: required groups start on their first option. */
export function initialSelection(groups: CustomizationGroup[]): Selection {
  const sel: Selection = {};
  for (const g of groups) sel[g.id] = g.isRequired && g.options.length > 0 ? [g.options[0]!.id] : [];
  return sel;
}

/** Applies a tap on `optionId` within `group`. */
export function toggleOption(sel: Selection, group: CustomizationGroup, optionId: string): Selection {
  const current = sel[group.id] ?? [];
  const isSelected = current.includes(optionId);
  let next: string[];
  switch (groupKind(group)) {
    case 'radio':
      next = [optionId];
      break;
    case 'optionalSingle':
      next = isSelected ? [] : [optionId];
      break;
    case 'multi':
      if (isSelected) next = current.filter((id) => id !== optionId);
      else if (current.length < group.maxSelectable) next = [...current, optionId];
      else return sel;
      break;
  }
  return { ...sel, [group.id]: next };
}

export function selectedOptions(groups: CustomizationGroup[], sel: Selection): CustomizationOption[] {
  return groups.flatMap((g) => g.options.filter((o) => (sel[g.id] ?? []).includes(o.id)));
}

export function missingRequiredGroups(groups: CustomizationGroup[], sel: Selection): CustomizationGroup[] {
  return groups.filter((g) => g.isRequired && g.options.length > 0 && (sel[g.id] ?? []).length === 0);
}
