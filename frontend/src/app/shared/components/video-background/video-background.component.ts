import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface VideoConfig {
  src: string;
  poster?: string;
  loop?: boolean;
  muted?: boolean;
  autoplay?: boolean;
  opacity?: number;
  blur?: number;
}

@Component({
  selector: 'app-video-background',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-background.component.html',
  styleUrls: ['./video-background.component.scss']
})
export class VideoBackgroundComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement', { static: true }) videoElement!: ElementRef<HTMLVideoElement>;
  
  @Input() videos: VideoConfig[] = [];
  @Input() randomize = false;
  @Input() transitionDuration = 1000; // ms
  @Input() videoDuration = 30000; // ms per video
  @Input() enabled = true;
  
  currentVideoIndex = 0;
  isTransitioning = false;
  private videoInterval?: number;
  private loadedVideos = new Set<string>();
  
  get currentVideo(): VideoConfig | null {
    return this.videos[this.currentVideoIndex] || null;
  }
  
  get videoStyle(): any {
    const video = this.currentVideo;
    if (!video) return {};
    
    return {
      opacity: this.isTransitioning ? 0 : (video.opacity || 1),
      filter: video.blur ? `blur(${video.blur}px)` : 'none',
      transition: `opacity ${this.transitionDuration}ms ease-in-out`
    };
  }
  
  ngOnInit(): void {
    if (this.enabled && this.videos.length > 0) {
      this.preloadVideos();
      this.startVideoRotation();
      
      if (this.randomize) {
        this.currentVideoIndex = Math.floor(Math.random() * this.videos.length);
      }
    }
  }
  
  ngOnDestroy(): void {
    this.stopVideoRotation();
  }
  
  private preloadVideos(): void {
    // Preload first few videos
    const preloadCount = Math.min(3, this.videos.length);
    for (let i = 0; i < preloadCount; i++) {
      this.preloadVideo(this.videos[i].src);
    }
  }
  
  private preloadVideo(src: string): void {
    if (this.loadedVideos.has(src)) return;
    
    const video = document.createElement('video');
    video.src = src;
    video.load();
    this.loadedVideos.add(src);
  }
  
  private startVideoRotation(): void {
    if (this.videos.length <= 1) return;
    
    this.videoInterval = window.setInterval(() => {
      this.nextVideo();
    }, this.videoDuration);
  }
  
  private stopVideoRotation(): void {
    if (this.videoInterval) {
      clearInterval(this.videoInterval);
      this.videoInterval = undefined;
    }
  }
  
  nextVideo(): void {
    if (this.videos.length <= 1) return;
    
    this.isTransitioning = true;
    
    setTimeout(() => {
      if (this.randomize) {
        let newIndex;
        do {
          newIndex = Math.floor(Math.random() * this.videos.length);
        } while (newIndex === this.currentVideoIndex && this.videos.length > 1);
        this.currentVideoIndex = newIndex;
      } else {
        this.currentVideoIndex = (this.currentVideoIndex + 1) % this.videos.length;
      }
      
      // Preload next video
      const nextIndex = (this.currentVideoIndex + 1) % this.videos.length;
      this.preloadVideo(this.videos[nextIndex].src);
      
      this.isTransitioning = false;
    }, this.transitionDuration / 2);
  }
  
  onVideoEnded(): void {
    if (!this.currentVideo?.loop) {
      this.nextVideo();
    }
  }
  
  onVideoError(event: Event): void {
    console.error('Video playback error:', event);
    // Skip to next video on error
    this.nextVideo();
  }
  
  playVideo(): void {
    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.play().catch(err => {
        console.error('Failed to play video:', err);
      });
    }
  }
  
  pauseVideo(): void {
    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.pause();
    }
  }
  
  toggleMute(): void {
    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.muted = !this.videoElement.nativeElement.muted;
    }
  }
}