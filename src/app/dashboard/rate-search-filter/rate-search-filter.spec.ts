import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { RateSearchFilterComponent } from './rate-search-filter';

describe('RateSearchFilterComponent', () => {
  let component: RateSearchFilterComponent;
  let fixture: ComponentFixture<RateSearchFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RateSearchFilterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RateSearchFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with empty searchQuery and filterCurrency', () => {
    expect(component.searchQuery()).toBe('');
    expect(component.filterCurrency()).toBe('');
  });

  it('should expose the POPULAR_CURRENCIES list', () => {
    expect(component.currencies.length).toBeGreaterThan(0);
  });

  describe('onSearchInput()', () => {
    it('should update searchQuery signal and emit searchChange', () => {
      const emitted: string[] = [];
      component.searchChange.subscribe(v => emitted.push(v));

      const event = { target: { value: 'EUR' } } as unknown as Event;
      component.onSearchInput(event);

      expect(component.searchQuery()).toBe('EUR');
      expect(emitted).toEqual(['EUR']);
    });

    it('should reflect the new value on the input element after detectChanges', () => {
      const event = { target: { value: 'USD' } } as unknown as Event;
      component.onSearchInput(event);
      fixture.detectChanges();

      const input = (fixture.nativeElement as HTMLElement).querySelector('input[type="search"]') as HTMLInputElement;
      expect(input.value).toBe('USD');
    });
  });

  describe('onFilterChange()', () => {
    it('should update filterCurrency signal and emit filterChange', () => {
      const emitted: string[] = [];
      component.filterChange.subscribe(v => emitted.push(v));

      component.onFilterChange('GBP');

      expect(component.filterCurrency()).toBe('GBP');
      expect(emitted).toEqual(['GBP']);
    });
  });

  describe('clearSearch()', () => {
    it('should reset both signals and emit empty strings for both outputs', () => {
      const searchEmitted: string[] = [];
      const filterEmitted: string[] = [];
      component.searchChange.subscribe(v => searchEmitted.push(v));
      component.filterChange.subscribe(v => filterEmitted.push(v));

      component.onSearchInput({ target: { value: 'JPY' } } as unknown as Event);
      component.onFilterChange('EUR');
      component.clearSearch();

      expect(component.searchQuery()).toBe('');
      expect(component.filterCurrency()).toBe('');
      expect(searchEmitted).toEqual(['JPY', '']);
      expect(filterEmitted).toEqual(['EUR', '']);
    });
  });

  describe('template', () => {
    it('should not render the clear button when searchQuery is empty', () => {
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector('.clear-btn');
      expect(btn).toBeNull();
    });

    it('should render the clear button when searchQuery is non-empty', () => {
      component.onSearchInput({ target: { value: 'USD' } } as unknown as Event);
      fixture.detectChanges();

      const btn = fixture.nativeElement.querySelector('.clear-btn');
      expect(btn).not.toBeNull();
    });

    it('should call clearSearch() when the clear button is clicked', () => {
      const clearSpy = vi.spyOn(component, 'clearSearch');
      component.onSearchInput({ target: { value: 'USD' } } as unknown as Event);
      fixture.detectChanges();

      ((fixture.nativeElement as HTMLElement).querySelector('.clear-btn') as HTMLButtonElement).click();
      expect(clearSpy).toHaveBeenCalled();
    });

    it('should hide the clear button after clearSearch() is called', () => {
      component.onSearchInput({ target: { value: 'USD' } } as unknown as Event);
      fixture.detectChanges();
      component.clearSearch();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.clear-btn')).toBeNull();
    });
  });
});
