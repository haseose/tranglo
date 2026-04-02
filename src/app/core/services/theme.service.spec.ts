import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';
import { ThemeMode } from '../models/currency.model';

// JSDOM does not implement window.matchMedia — stub it
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');

    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
    TestBed.flushEffects();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should default to light theme when no preference is stored', () => {
    expect(service.theme()).toBe(ThemeMode.Light);
  });

  it('should apply data-theme attribute on construction', () => {
    expect(document.documentElement.getAttribute('data-theme')).toBe(ThemeMode.Light);
  });

  it('toggleTheme() should switch from light to dark', () => {
    service.toggleTheme();
    TestBed.flushEffects();
    expect(service.theme()).toBe(ThemeMode.Dark);
  });

  it('toggleTheme() should switch back from dark to light', () => {
    service.toggleTheme();
    service.toggleTheme();
    TestBed.flushEffects();
    expect(service.theme()).toBe(ThemeMode.Light);
  });

  it('should persist theme to localStorage on toggle', () => {
    service.toggleTheme();
    TestBed.flushEffects();
    expect(localStorage.getItem('app-theme')).toBe(ThemeMode.Dark);
  });

  it('should read saved theme from localStorage on init', () => {
    localStorage.setItem('app-theme', ThemeMode.Dark);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const newService = TestBed.inject(ThemeService);
    TestBed.flushEffects();
    expect(newService.theme()).toBe(ThemeMode.Dark);
  });
});
