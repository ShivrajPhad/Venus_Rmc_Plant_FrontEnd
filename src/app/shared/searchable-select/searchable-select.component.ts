import {
  booleanAttribute,
  Component,
  ElementRef,
  forwardRef,
  HostListener,
  Input,
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormsModule,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';

export interface SearchableSelectOption {
  value: number;
  label: string;
}

@Component({
  selector: 'app-searchable-select',
  imports: [FormsModule],
  templateUrl: './searchable-select.component.html',
  styleUrl: './searchable-select.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true,
    },
  ],
})
export class SearchableSelectComponent implements ControlValueAccessor, Validator {
  @Input({ required: true }) id = '';
  @Input() ariaLabel = 'Select an option';
  @Input() placeholder = 'Select an option';
  @Input() disabled = false;
  @Input({ transform: booleanAttribute }) required = false;
  @Input() options: SearchableSelectOption[] = [];

  selectedValue: number | null = null;
  search = '';
  open = false;
  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  get filteredOptions(): SearchableSelectOption[] {
    const query = this.search.trim().toLocaleLowerCase();
    return query
      ? this.options.filter((option) => option.label.toLocaleLowerCase().includes(query))
      : this.options;
  }

  get selectedLabel(): string {
    return this.options.find((option) => option.value === this.selectedValue)?.label ?? '';
  }

  toggle(): void {
    if (this.disabled) {
      return;
    }
    this.open = !this.open;
    this.search = '';
  }

  select(option: SearchableSelectOption): void {
    this.selectedValue = option.value;
    this.onChange(this.selectedValue);
    this.onTouched();
    this.close();
  }

  close(): void {
    this.open = false;
    this.search = '';
    this.onTouched();
  }

  writeValue(value: number | null): void {
    this.selectedValue = value;
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
    if (disabled) {
      this.close();
    }
  }

  validate(control: AbstractControl): ValidationErrors | null {
    return this.required && control.value === null ? { required: true } : null;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.close();
    }
  }
}
