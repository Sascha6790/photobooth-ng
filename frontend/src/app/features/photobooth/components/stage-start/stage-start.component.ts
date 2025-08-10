import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { SharedModule } from '../../../../shared/shared-module';
import { ConfigService, PhotoboothConfig } from '../../../../core/services/config/config';
import { LanguageService } from '../../../../core/services/language/language';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-stage-start',
  standalone: true,
  imports: [CommonModule, SharedModule, TranslatePipe],
  templateUrl: './stage-start.component.html',
  styleUrls: ['./stage-start.component.scss']
})
export class StageStartComponent implements OnInit {
  @Output() actionTriggered = new EventEmitter<string>();
  
  config$!: Observable<PhotoboothConfig | null>;
  logoUrl = '/resources/img/logo-white-1024.png';
  
  constructor(
    private configService: ConfigService,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.config$ = this.configService.config$;
    this.configService.loadConfig().subscribe();
  }

  onStart(): void {
    console.log('Starting photobooth session');
    this.actionTriggered.emit('photo');
  }
}