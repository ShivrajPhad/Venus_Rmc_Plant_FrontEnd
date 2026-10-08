import { ElementRef } from '@angular/core';
import { FormControl } from '@angular/forms';
import { SearchableSelectComponent } from './searchable-select.component';

describe('SearchableSelectComponent', () => {
  it('filters options using the text entered in the dropdown search box', () => {
    const component = new SearchableSelectComponent(new ElementRef(document.createElement('div')));
    component.options = [
      { value: 1, label: 'Customer One' },
      { value: 2, label: 'Customer Two' },
    ];
    component.search = 'two';

    expect(component.filteredOptions).toEqual([{ value: 2, label: 'Customer Two' }]);
  });

  it('selects an option and updates the form value', () => {
    const component = new SearchableSelectComponent(new ElementRef(document.createElement('div')));
    const control = new FormControl<number | null>(null);
    component.options = [{ value: 4, label: 'Truck 4' }];
    component.registerOnChange((value) => control.setValue(value));

    component.select({ value: 4, label: 'Truck 4' });

    expect(control.value).toBe(4);
    expect(component.selectedLabel).toBe('Truck 4');
    expect(component.open).toBe(false);
  });

  it('reports a required error when no option is selected', () => {
    const component = new SearchableSelectComponent(new ElementRef(document.createElement('div')));
    component.required = true;

    expect(component.validate(new FormControl(null))).toEqual({ required: true });
    expect(component.validate(new FormControl(1))).toBeNull();
  });
});
