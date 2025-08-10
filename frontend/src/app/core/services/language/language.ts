import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface Translation {
  [key: string]: string | Translation;
}

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private currentLanguage = 'en';
  private translationsSubject = new BehaviorSubject<Translation>({});
  public translations$ = this.translationsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadLanguage(this.currentLanguage);
  }

  loadLanguage(lang: string): Observable<Translation> {
    return this.http.get<Translation>(`/assets/i18n/${lang}.json`).pipe(
      tap(translations => {
        this.currentLanguage = lang;
        this.translationsSubject.next(translations);
        localStorage.setItem('language', lang);
      })
    );
  }

  translate(key: string): string {
    const translations = this.translationsSubject.value;
    const keys = key.split('.');
    let value: any = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }

    return typeof value === 'string' ? value : key;
  }

  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  getAvailableLanguages(): string[] {
    return ['en', 'de', 'fr', 'es', 'it', 'nl', 'pl', 'cs', 'hu', 'el', 'ru', 'ja', 'ko', 'zh'];
  }
}
