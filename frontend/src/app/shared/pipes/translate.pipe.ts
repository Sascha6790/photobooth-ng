import { Pipe, PipeTransform } from '@angular/core';
import { LanguageService } from '../../core/services/language/language';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false
})
export class TranslatePipe implements PipeTransform {
  constructor(private languageService: LanguageService) {}

  transform(key: string, ...args: unknown[]): string {
    if (!key) return '';
    return this.languageService.translate(key);
  }
}