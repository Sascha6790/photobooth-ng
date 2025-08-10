import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET', 'photobooth-secret-key'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.findUserById(payload.sub);
    
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    return { 
      userId: payload.sub, 
      username: payload.username, 
      role: payload.role 
    };
  }
}